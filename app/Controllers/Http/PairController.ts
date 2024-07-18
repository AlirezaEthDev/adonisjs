import {
  computePairAddress,
  Currency,
  CurrencyAmount, Fraction, JSBI,
  ONE_HUNDRED_PERCENT,
  Pair,
  Percent,
  Token,
  Trade,
  TradeType,
} from "@pancakeswap/sdk"
import Web3 from "web3";
import _ from 'lodash'
import {
  ALLOWED_PRICE_IMPACT_HIGH,
  ALLOWED_PRICE_IMPACT_LOW,
  ALLOWED_PRICE_IMPACT_MEDIUM, BIPS_BASE,
  BLOCKED_PRICE_IMPACT_NON_EXPERT, BUYBACK_FEE, Field,
  INPUT_FRACTION_AFTER_FEE, LP_HOLDERS_FEE,
  ONE_BIPS, TOTAL_FEE, TREASURY_FEE,
} from "Resources/global/exchange";

import {
  Router_Abi,
  Factory_Abi,
  Pair_Abi,
  Router_V2_Abi,
} from 'Resources/abis'

import Chains from 'Resources/chains'

import Tokens from 'Resources/tokens'
import MultiCallController from "App/Controllers/Http/MultiCallController";
import {zeroAddress} from "ethereumjs-util";

const bigNumber = Web3.utils.toTwosComplement('-1')


interface Pairs {
  contract: string,
  tokens: Token[]
}


export default class PairController {
  static getIntermediaryTokens(chainId) {
    const tokens = Tokens[chainId]
    const intermediateTokens = ['WBNB', 'ETH', 'BTCB', 'USDT', 'USDC', 'CAKE', 'BUSD']
    return intermediateTokens
      .map(e => {
        let token = tokens.find(a => a.symbol === e);
        if (token) return PairController.newToken(token)
      })
      .filter(e => e)
  }

  static getPairTokens(tokens: Token[]): Token[][] {
    let res: Token[][] = []
    for (let i = 0; i <= tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[i].address === tokens[j].address) continue
        res.push([tokens[i], tokens[j]])
      }
    }
    return res
  }

  static getPairTokenContract(pairTokens: Token[][]): Pairs[] {
    return pairTokens.map(e => {
      const contract = PairController.getLPToken(e)
      return {
        contract,
        tokens: e,
      }
    })
  }

  static availablePairs(pairTokens: Token[][]) {
    return this.getPairTokenContract(pairTokens)
  }

  static sortAvailablePairs(pairTokens: Pairs[]): Pairs[] {
    return pairTokens.map(e => {
        const isSorted = PairController.isSorted(e.tokens)
        if (!isSorted) {
          e.tokens = [e.tokens[1], e.tokens[0]]
        }
        return e
      }
    )
  }

  static async getPairTokenReserves(pairTokens: Pairs[]) {
    return await Promise.all(pairTokens.map(async (e) => {
        try {
          const reserves = await PairController.getTokenReserves(e.tokens[0].chainId, e.contract)
          return {
            ...e,
            reserves
          }
        } catch (_) {
        }
      }
    ))
  }

  static createPair(pairTokens) {
    return pairTokens.map(e => {
      return new Pair(
        CurrencyAmount.fromRawAmount(e.tokens[0], e.reserves[0]),
        CurrencyAmount.fromRawAmount(e.tokens[1], e.reserves[1])
      )
    })
  }

  static bestTradeRoutes(pairs: Pair[], inputTokens: Token[], amount: number, isFrom) {
    const fromToken = inputTokens[isFrom ? 0 : 1]
    const rawAmount = CurrencyAmount.fromRawAmount(fromToken, amount * (10 ** fromToken.decimals))
    return isFrom ?
      Trade.bestTradeExactIn(
        pairs,
        rawAmount,
        inputTokens[1]
      ) :
      Trade.bestTradeExactOut(
        pairs,
        inputTokens[0],
        rawAmount
      )
  }

  static bestTradeRoute(pairs) {
    const toNumber = (e) => parseFloat(e?.executionPrice?.toSignificant(8) || '0')
    const pairsNumber = pairs.map(toNumber)
    const bestPrice = pairsNumber.reduce((p, c) => Math.max(p, c), 0)
    const bestPairs = pairs.filter(e => toNumber(e) === bestPrice)
    return _.minBy(bestPairs, (e) => e.route.path.length)
  }

  static computeTradePriceBreakdown(trade: Trade<Currency, Currency, TradeType> | null) {
    // for each hop in our trade, take away the x*y=k price impact from 0.3% fees
    // e.g. for 3 tokens/2 hops: 1 - ((1 - .03) * (1-.03))
    const realizedLPFee = !trade
      ? undefined
      : ONE_HUNDRED_PERCENT.subtract(
        trade.route.pairs.reduce<Fraction>(
          (currentFee: Fraction): Fraction => currentFee.multiply(INPUT_FRACTION_AFTER_FEE),
          ONE_HUNDRED_PERCENT,
        ),
      )

    // remove lp fees from price impact
    const priceImpactWithoutFeeFraction = trade && realizedLPFee ? trade?.priceImpact.subtract(realizedLPFee) : undefined

    // the x*y=k impact
    const priceImpactWithoutFeePercent = priceImpactWithoutFeeFraction
      ? new Percent(priceImpactWithoutFeeFraction?.numerator, priceImpactWithoutFeeFraction?.denominator)
      : undefined

    const priceImpact = priceImpactWithoutFeePercent ? (priceImpactWithoutFeePercent.lessThan(ONE_BIPS) ? '<0.01%' : `${priceImpactWithoutFeePercent.toFixed(2)}%`) : '-'
    const impactWarn = PairController.warningSeverity(priceImpactWithoutFeePercent)

    // the amount of the input that accrues to LPs
    const realizedLPFeeAmount =
      realizedLPFee &&
      trade &&
      CurrencyAmount.fromRawAmount(
        trade.inputAmount.currency,
        realizedLPFee.multiply(trade.inputAmount.quotient).quotient,
      )

    return {priceImpact, impactWarn, realizedLPFee: realizedLPFeeAmount?.toSignificant(4)}
  }

  static warningSeverity(priceImpact: Percent | undefined): 0 | 1 | 2 | 3 | 4 {
    if (!priceImpact?.lessThan(BLOCKED_PRICE_IMPACT_NON_EXPERT)) return 4
    if (!priceImpact?.lessThan(ALLOWED_PRICE_IMPACT_HIGH)) return 3
    if (!priceImpact?.lessThan(ALLOWED_PRICE_IMPACT_MEDIUM)) return 2
    if (!priceImpact?.lessThan(ALLOWED_PRICE_IMPACT_LOW)) return 1
    return 0
  }

  static computeSlippageAdjustedAmounts(
    trade: Trade<Currency, Currency, TradeType> | undefined,
    allowedSlippage: number,
  ): { [field in Field]?: CurrencyAmount<Currency> } {
    const pct = PairController.basisPointsToPercent(allowedSlippage)
    return {
      [Field.INPUT]: trade?.maximumAmountIn(pct),
      [Field.OUTPUT]: trade?.minimumAmountOut(pct),
    }
  }

  static basisPointsToPercent(num: number): Percent {
    return new Percent(JSBI.BigInt(num), BIPS_BASE)
  }

  static feePercent() {
    const totalFeePercent = `${(TOTAL_FEE * 100).toFixed(2)}%`
    const lpHoldersFeePercent = `${(LP_HOLDERS_FEE * 100).toFixed(2)}%`
    const treasuryFeePercent = `${(TREASURY_FEE * 100).toFixed(4)}%`
    const buyBackFeePercent = `${(BUYBACK_FEE * 100).toFixed(4)}%`
    return {totalFeePercent, lpHoldersFeePercent, treasuryFeePercent, buyBackFeePercent}
  }

  static getChain(chainId) {
    return Chains.find(e => e.chainId === chainId) || Chains[0]
  }

  static getLPToken(pair: Token[]) {
    // const {FactoryContract} = PairController.getContractInstant(pair?.[0]?.chainId)
    // return await FactoryContract.methods.getPair(pair[0].address, pair[1].address).call()
    const chain = PairController.getChain(pair[0]?.chainId)
    return computePairAddress({factoryAddress: chain.factory, tokenA: pair[0], tokenB: pair[1]})
  }

  static async getTokenReserves(chainId, lpToken) {
    const {PairContract} = PairController.getContractInstant(chainId, lpToken)
    // @ts-ignore
    return PairContract.methods.getReserves().call()
  }

  static async getLpTokenNonce(chainId, lpToken, address) {
    const {PairContract} = PairController.getContractInstant(chainId, lpToken)
    // @ts-ignore
    return PairContract.methods.nonces(address).call()
  }

  static async getLPTokenDetails(chainId, lpToken) {
    const {PairContract} = PairController.getContractInstant(chainId, lpToken)
    // @ts-ignore
    const fromTokenAddress = await PairContract.methods.token0().call()
    const fromToken = await PairController.getTokenDetail(fromTokenAddress, chainId)
    // @ts-ignore
    const toTokenAddress = await PairContract.methods.token1().call()
    const toToken = await PairController.getTokenDetail(toTokenAddress, chainId)
    return {
      fromToken,
      toToken
    }
  }


  static isSorted(pair: Token[]) {
    return pair[0].sortsBefore(pair[1])
  }

  static newToken(token): Token {
    return new Token(token.chainId, token.address, token.decimals, token.symbol)
  }

  static getContractInstant(chainId, lpToken = '') {
    const chain = Chains.find(e => e.chainId === chainId) || Chains[0]
    const web3 = new Web3(chain.rpcUrl)
    // @ts-ignore
    const FactoryContract = new web3.eth.Contract(Factory_Abi, chain.factory)
    // @ts-ignore
    const RouterContract = new web3.eth.Contract(Router_Abi, chain.router)
    // @ts-ignore
    const RouterV2Contract = new web3.eth.Contract(Router_V2_Abi, chain.routerv2)
    // @ts-ignore
    const PairContract = lpToken && new web3.eth.Contract(Pair_Abi, lpToken)
    return {
      chain,
      web3,
      FactoryContract,
      RouterContract,
      RouterV2Contract,
      PairContract
    }
  }

  static getDefaultLpTokens(chainId) {
    const defaultTokens = PairController.getIntermediaryTokens(chainId)
    // @ts-ignore
    const defaultPairs = PairController.getPairTokens(defaultTokens)
    return {
      lpTokens: defaultPairs.map(e => ({
        address: PairController.getLPToken(e),
        fromToken: e[0],
        toToken: e[1]
      })),
      contracts: defaultPairs.map(e => PairController.getLPToken(e))
    }
  }

  static async getLpBalances(chainId, address, contracts) {
    const chain = PairController.getChain(chainId)
    return await MultiCallController.manyToOne(chain.rpcUrl, {
      contracts: contracts,
      abi: [{
        "constant": true,
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }],
      method: 'balanceOf',
      params: address
    })
  }

  static async getTokenBalance(chainId, contract, address) {
    const {PairContract} = PairController.getContractInstant(chainId, contract)
    // @ts-ignore
    return await PairContract.methods.balanceOf(address).call()
  }

  static async getTotalSupply(chainId, contract) {
    const {PairContract} = PairController.getContractInstant(chainId, contract)
    // @ts-ignore
    return await PairContract.methods.totalSupply().call()
  }

  static async getDecimal(chainId, contract) {
    const {PairContract} = PairController.getContractInstant(chainId, contract)
    // @ts-ignore
    return parseInt(await PairContract.methods.decimals().call())
  }

  static async getTokenDetail(address, chainId) {
    const chain = Tokens[chainId].find(e => e.address.toLowerCase() === address.toLowerCase())
    if (chain) {
      return chain
    } else {
      const {PairContract} = PairController.getContractInstant(chainId, address)
      // @ts-ignore
      const symbol = await PairContract.methods.symbol().call()
      // @ts-ignore

      const name = await PairContract.methods.name().call()
      // @ts-ignore

      const decimals = await PairContract.methods.decimals().call()
      return {
        name,
        symbol,
        address,
        chainId,
        decimals,
        "logoURI": "https://file.holygun.app/files/pancake-default-token.svg"
      }
    }

  }

  static async isERC20Approved(chainId, address, token: Token, destination) {
    if (token.address === zeroAddress()) {
      return {
        isNotApproved: false,
      }
    }
    const chain = this.getChain(chainId)
    const target = destination || chain.router
    const {PairContract} = this.getContractInstant(chainId, token.address)
    // @ts-ignore
    const allowance = await PairContract.methods.allowance(address, target).call()
    if (!Number(allowance)) {
      // @ts-ignore
      const data = PairContract.methods.approve(target, bigNumber).encodeABI()
      const tx = {
        to: token.address,
        from: address,
        value: '0',
        data,
      }
      return {
        isNotApproved: true,
        tx
      }
    }
    return {
      isNotApproved: false,
    }
  }
}


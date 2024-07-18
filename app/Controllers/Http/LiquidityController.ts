import {HttpContextContract} from "@ioc:Adonis/Core/HttpContext";
import {
  addLiquiditySchema, getLiquidityPermit,
  getLiquiditySchema, liquidityDataSchema,
  liquidityDetailsSchema,
  liquidityPairSchema, removeLiquiditySchema
} from "App/Validation/LiquiditySchema";
import {Token} from "@pancakeswap/sdk";
import PairController from "App/Controllers/Http/PairController";
import {Big} from 'big.js'
import Chains from "Resources/chains";
import {DateTime} from "luxon";
import Web3 from "web3";

export default class LiquidityController {
  public async liquidityParams({request, response}: HttpContextContract) {
    let inputTokens: Token[] = []
    const payload = await request.validate({schema: liquidityPairSchema})
    inputTokens[0] = PairController.newToken(payload.fromToken)
    inputTokens[1] = PairController.newToken(payload.toToken)
    const LPToken = PairController.getLPToken(inputTokens)
    try {
      const isSorted = PairController.isSorted(inputTokens)
      const reserves = await PairController.getTokenReserves(payload.fromToken.chainId, LPToken)
      return {
        fromReserve: reserves[isSorted ? 0 : 1],
        toReserve: reserves[!isSorted ? 0 : 1],
        LPToken,
      }
    } catch (e) {
      return response.notFound(["LP Token isn't exist", e.message])
    }


  }

  public async liquidityDetails({request}: HttpContextContract) {
    const payload = await request.validate({schema: liquidityDetailsSchema})
    return await LiquidityController.getLiquidityDetails({
      fromToken: payload.fromToken,
      toToken: payload.toToken
    }, payload.address)
  }

  public async liquidityData({request}: HttpContextContract) {
    const payload = await request.validate({schema: liquidityDataSchema})
    const tokens = await PairController.getLPTokenDetails(payload.chainId, payload.contract)
    const details = await LiquidityController.getLiquidityDetails({
      fromToken: tokens.fromToken,
      toToken: tokens.toToken
    }, payload.address)
    return {
      tokens,
      details
    }
  }

  public async addLiquidity({request}: HttpContextContract) {
    const payload = await request.validate({schema: addLiquiditySchema})
    const chain = Chains.find(e => e.chainId === payload.chainId)
    const {RouterV2Contract} = PairController.getContractInstant(payload.chainId)
    const fromAmount = new Big(payload.fromAmount).times(10 ** payload.fromToken.decimals)
    const toAmount = new Big(payload.toAmount).times(10 ** payload.toToken.decimals)
    const fromAmountMin = fromAmount.times(100 - payload.slippage).div(100)
    const toAmountMin = toAmount.times(100 - payload.slippage).div(100)
    const deadline = DateTime.now().plus({minute: payload.deadline}).toSeconds().toFixed(0)
    const addLiquidityData = [
      payload.fromToken.address,
      payload.toToken.address,
      fromAmount.toFixed(0),
      toAmount.toFixed(0),
      fromAmountMin.toFixed(0),
      toAmountMin.toFixed(0),
      payload.toAddress,
      deadline
    ]
    const data = RouterV2Contract.methods.addLiquidity(...addLiquidityData).encodeABI()
    return {
      to: chain?.routerv2,
      // from: address,
      value: '0',
      data,
      // orderArray: [this.getOrderArray(orderObject), signature, amount]
    }
  }

  public async getLiquidity({request}: HttpContextContract) {
    const payload = await request.validate({schema: getLiquiditySchema})
    const {lpTokens, contracts} = PairController.getDefaultLpTokens(payload.chainId)
    const allLpTokens = [...new Set([...contracts, ...(payload.localeTokens?.map(e => e.address) || [])])]
    const lpBalances = await PairController.getLpBalances(payload.chainId, payload.address, allLpTokens)
    const availabelLpBalances = lpBalances
      .map((e, i) => ({
        contract: allLpTokens[i],
        balance: e
      }))
      .filter(e => e.balance != '0' && e.balance != '')
      .map(a => {
        const contract = lpTokens.find(e => e.address === a.contract) || payload.localeTokens?.find(e => e.address === a.contract)
        return {
          fromToken: contract?.fromToken,
          toToken: contract?.toToken,
          address: a.contract,
          balance: a.balance
        }
      })
    return await Promise.all(availabelLpBalances.map(async (e) => ({
      lpContract: e,
      details: await LiquidityController.getLiquidityDetails({...e}, payload.address)
    })))
  }

  public async getPermitData({request}: HttpContextContract) {
    const payload = await request.validate({schema: getLiquidityPermit})
    const nonce = await PairController.getLpTokenNonce(payload.chainId, payload.contract, payload.address)
    const chain = PairController.getChain(payload.chainId)
    const deadline = DateTime.now().plus({minute: payload.deadline}).toSeconds().toFixed(0)

    const EIP712Domain = [
      {name: 'name', type: 'string'},
      {name: 'version', type: 'string'},
      {name: 'chainId', type: 'uint256'},
      {name: 'verifyingContract', type: 'address'},
    ]
    const domain = {
      name: 'Pancake LPs',
      version: '1',
      chainId: payload.chainId,
      verifyingContract: payload.contract,
    }
    const Permit = [
      {name: 'owner', type: 'address'},
      {name: 'spender', type: 'address'},
      {name: 'value', type: 'uint256'},
      {name: 'nonce', type: 'uint256'},
      {name: 'deadline', type: 'uint256'},
    ]
    const message = {
      owner: payload.address,
      spender: chain.router,
      value: payload.liquidity,
      nonce: Web3.utils.toHex(nonce).toString(),
      deadline,
    }
    return {
      data: {
        liquidity: payload.liquidity,
        deadline
      },
      message: JSON.stringify({
        types: {
          EIP712Domain,
          Permit,
        },
        domain,
        primaryType: 'Permit',
        message,
      })
    }
  }

  public bigAmount(amount,decimal,slippage){
    return new Big(amount).times(10 ** decimal).times(100 - slippage).div(100).toFixed(0)
  }

  public async remove({request}: HttpContextContract) {
    const payload = await request.validate({schema: removeLiquiditySchema})
    const chain = Chains.find(e => e.chainId === payload.chainId)
    const {RouterContract} = PairController.getContractInstant(payload.chainId)
    const fromAmount = this.bigAmount(payload.fromAmount,payload.fromToken.decimals,payload.slippage)
    const toAmount = this.bigAmount(payload.toAmount,payload.toToken.decimals,payload.slippage)
    const removeLiquidityData = [
      payload.fromToken.address,
      payload.toToken.address,
      payload.liquidity,
      fromAmount,
      toAmount,
      payload.toAddress,
      payload.deadline,
      payload.approveMax ?? false,
      payload.permit.v,
      payload.permit.r,
      payload.permit.s
    ]
    const data = RouterContract.methods.removeLiquidityWithPermit(...removeLiquidityData).encodeABI()
    return {
      to: chain?.router,
      // from: address,
      value: '0',
      data,
      // orderArray: [this.getOrderArray(orderObject), signature, amount]
    }
  }

  static async getLiquidityDetails({fromToken, toToken}, address) {
    let inputTokens: Token[] = []
    inputTokens[0] = PairController.newToken(fromToken)
    inputTokens[1] = PairController.newToken(toToken)
    const LPToken = PairController.getLPToken(inputTokens)
    const decimal = await PairController.getDecimal(fromToken.chainId, LPToken)
    let balance = await PairController.getTokenBalance(fromToken.chainId, LPToken, address)
    const reserves = await PairController.getTokenReserves(fromToken.chainId, LPToken)
    const isSorted = PairController.isSorted(inputTokens)
    const totalSupply = await PairController.getTotalSupply(fromToken.chainId, LPToken)
    const tradingPair = new Big(balance).div(totalSupply)
    const fromReserve = reserves[isSorted ? 0 : 1]
    const toReserve = reserves[!isSorted ? 0 : 1]
    return {
      LPToken,
      balance: new Big(balance).div(10 ** decimal).toFixed(decimal),
      decimal,
      totalSupply,
      tradingPair: tradingPair.mul(100).toPrecision(8),
      fromPooled: tradingPair.mul(fromReserve).div(10 ** fromToken.decimals).toPrecision(6),
      toPooled: tradingPair.mul(toReserve).div(10 ** toToken.decimals).toPrecision(6),
    }
  }


}

import type {HttpContextContract} from '@ioc:Adonis/Core/HttpContext'
import {
  CurrencyAmount,
  Route,
  // Router,
  Token,
  Trade,
  // Percent
} from "@pancakeswap/sdk"
import {getApproveSchema, newTradeSchema, newTransactionSchema} from "App/Validation/TradeSchema";
import PairController from "App/Controllers/Http/PairController";

import Chains from 'Resources/chains'
import {DateTime} from "luxon";

export default class TradesController {
  public async trade({request}: HttpContextContract) {
    let inputTokens: Token[] = []
    const payload = await request.validate({schema: newTradeSchema})
    inputTokens[0] = PairController.newToken(payload.fromToken)
    inputTokens[1] = PairController.newToken(payload.toToken)
    const betweenTokens = PairController.getIntermediaryTokens(payload.chainId)
    // @ts-ignore
    const pairTokens = PairController.getPairTokens([...inputTokens, ...betweenTokens])
    // TODO:need improvement
    const availablePairs = PairController.availablePairs(pairTokens)
    const sortAvailablePairs = PairController.sortAvailablePairs(availablePairs)
    const pairTokenReserve = (await PairController.getPairTokenReserves(sortAvailablePairs)).filter(e => !!e)
    const allPairs = PairController.createPair(pairTokenReserve)
    const bestTradeRoutes = PairController.bestTradeRoutes(allPairs, inputTokens, payload.amount, payload.isFrom)
    const bestTradeRoute = PairController.bestTradeRoute(bestTradeRoutes)

    const fromToken = inputTokens[payload.isFrom ? 0 : 1]

    const trade = Trade[payload.isFrom ? 'exactIn' : 'exactOut'](
      new Route(bestTradeRoute.route.pairs, inputTokens[0], inputTokens[1]),
      CurrencyAmount.fromRawAmount(fromToken, payload.amount * (10 ** fromToken.decimals))
    )
    const {priceImpact, impactWarn, realizedLPFee} = PairController.computeTradePriceBreakdown(trade)

    const {OUTPUT, INPUT} = PairController.computeSlippageAdjustedAmounts(trade, payload.slippage * 100)

    // const swapSetting = {
    //   deadline: payload.setting.deadline * 60,
    //   recipient: payload.setting.recipient || payload.toAddress,
    //   allowedSlippage: new Percent(payload.setting.slippage * 100, '10000'),
    //   // feeOnTransfer
    // }
    // const transaction = Router.swapCallParameters(trade, swapSetting)
    const {totalFeePercent, lpHoldersFeePercent, treasuryFeePercent, buyBackFeePercent} = PairController.feePercent()
    return {
      // @ts-ignore
      // fromAmount: (new Big(Web3.utils.toBN(transaction.args[payload.isFrom ? 0 : 1]).toString())).div(10 ** fromToken.decimals),
      // @ts-ignore
      // toAmount: (new Big(Web3.utils.toBN(transaction.args[payload.isFrom ? 1 : 0]).toString())).div(10 ** toToken.decimals),
      path: trade.route.path,
      priceImpact,
      impactWarn,
      realizedLPFee,
      totalFeePercent,
      lpHoldersFeePercent,
      treasuryFeePercent,
      buyBackFeePercent,
      minMaxReceived: payload.isFrom ? OUTPUT?.toSignificant(5) : INPUT?.toSignificant(5),
      price: trade.executionPrice.toSignificant(8),
      invertPrice: trade.executionPrice.invert().toSignificant(6),
      // transaction
    }
  }

  public async transaction({request}: HttpContextContract) {
    const payload = await request.validate({schema: newTransactionSchema})
    const chain = Chains.find(e => e.chainId === payload.chainId)
    if (!chain) throw new Error('Invalid chain Id')
    const {RouterContract} = PairController.getContractInstant(chain.chainId)
    // @ts-ignore
    const deadline = DateTime.now().plus({minute: payload.deadline}).toSeconds().toFixed(0)
    const data = RouterContract.methods[payload.data.isFrom ? 'swapExactTokensForTokens' : 'swapTokensForExactTokens'](payload.data.amount, payload.data.minMaxReceived, payload.data.path, payload.data.recipient).encodeABI()
    return {
      to: chain.router,
      // from: address,
      value: '0',
      data,
      // orderArray: [this.getOrderArray(orderObject), signature, amount]
    }
  }

  public async getApprove({request}: HttpContextContract) {
    const payload = await request.validate({schema: getApproveSchema})
    const token = PairController.newToken(payload.token)
    return await PairController.isERC20Approved(payload.chainId, payload.address, token, payload.destinationAddress)
  }
}


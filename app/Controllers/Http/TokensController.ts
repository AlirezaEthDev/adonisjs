import {HttpContextContract} from "@ioc:Adonis/Core/HttpContext";
import {getTokenBalanceSchema, tokensSchema} from "App/Validation/TokenSchema";
import Tokens from 'Resources/tokens'
import PairController from "App/Controllers/Http/PairController";
import {Big} from 'big.js'
import _ from 'lodash'

export default class TokensController {

  public async index({request}: HttpContextContract) {
    const payload = await request.validate({schema: tokensSchema})
    return request.body().best ? Tokens[payload.chainId]?.filter(e => e.common) : Tokens[payload.chainId]
  }

  public async getBalance({request}: HttpContextContract) {
    const payload = await request.validate({schema: getTokenBalanceSchema})
    return _.floor(new Big(await PairController.getTokenBalance(payload.chainId, payload.tokenContract.address, payload.address)).div(10 ** payload.tokenContract.decimals), 5)
  }
}

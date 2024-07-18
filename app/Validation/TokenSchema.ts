import {schema} from "@ioc:Adonis/Core/Validator";

export const tokensSchema = schema.create({
  chainId: schema.number()
})

export const getTokenBalanceSchema = schema.create({
  chainId: schema.number(),
  tokenContract: schema.object().members({
    name: schema.string(),
    symbol: schema.string(),
    address: schema.string(),
    chainId: schema.number(),
    decimals: schema.number(),
  }),
  address: schema.string()
})

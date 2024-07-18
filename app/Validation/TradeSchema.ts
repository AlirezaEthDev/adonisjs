import {schema} from "@ioc:Adonis/Core/Validator";

export const newTradeSchema = schema.create({
  chainId: schema.number(),
  fromToken: schema.object().members({
    name: schema.string(),
    symbol: schema.string(),
    address: schema.string(),
    chainId: schema.number(),
    decimals: schema.number(),
  }),
  toToken: schema.object().members({
    name: schema.string(),
    symbol: schema.string(),
    address: schema.string(),
    chainId: schema.number(),
    decimals: schema.number(),
  }),
  amount: schema.number(),
  isFrom: schema.boolean(),
  slippage : schema.number()
})

export const newTransactionSchema = schema.create({
  chainId : schema.number() ,
  data : schema.object().members({
    amount : schema.string(),
    isFrom : schema.boolean(),
    recipient : schema.string(),
    minMaxReceived : schema.string(),
    path : schema.array().members(schema.string()),
    deadline : schema.number(),
  })
})

export const getApproveSchema = schema.create({
  chainId : schema.number(),
  token: schema.object().members({
    name: schema.string(),
    symbol: schema.string(),
    address: schema.string(),
    chainId: schema.number(),
    decimals: schema.number(),
  }),
  address: schema.string(),
  destinationAddress: schema.string.optional()
})

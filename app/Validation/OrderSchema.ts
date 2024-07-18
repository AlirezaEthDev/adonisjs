import {schema} from "@ioc:Adonis/Core/Validator";

export const storeOrderSchema = schema.create({
  orderId: schema.string(),
  chainId: schema.number(),
  address: schema.string(),
  from: schema.object().members({
    name: schema.string(),
    symbol: schema.string(),
    address: schema.string(),
    chainId: schema.number(),
    decimals: schema.number(),
  }),
  to: schema.object().members({
    name: schema.string(),
    symbol: schema.string(),
    address: schema.string(),
    chainId: schema.number(),
    decimals: schema.number(),
  }),
  amount: schema.string(),
  price: schema.string(),
  deadline: schema.number.optional(),
  sig: schema.string()
})
export const updateOrderSchema = schema.create({
  filled: schema.string()
})

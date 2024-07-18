import {schema} from "@ioc:Adonis/Core/Validator";

export const liquidityPairSchema = schema.create({
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
})

export const liquidityDetailsSchema = schema.create({
  address: schema.string(),
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
})


export const liquidityDataSchema = schema.create({
  address: schema.string(),
  chainId: schema.number(),
  contract : schema.string()
})

export const addLiquiditySchema = schema.create({
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
  fromAmount: schema.string(),
  toAmount: schema.string(),
  toAddress: schema.string(),
  slippage: schema.number(),
  deadline: schema.number()
})
export const getLiquiditySchema = schema.create({
  chainId: schema.number(),
  address: schema.string(),
  localeTokens: schema.array.optional().members(schema.object().members({
    address: schema.string(),
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
  }))
})

export const getLiquidityPermit = schema.create({
  chainId: schema.number(),
  address: schema.string(),
  contract: schema.string(),
  liquidity: schema.string(),
  deadline: schema.number(),
})

export const removeLiquiditySchema = schema.create({
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
  liquidity: schema.string(),
  fromAmount: schema.string(),
  toAmount: schema.string(),
  toAddress: schema.string(),
  slippage: schema.number(),
  deadline: schema.number(),
  approveMax: schema.boolean.optional(),
  permit: schema.object().members({
    r: schema.string(),
    s: schema.string(),
    v: schema.number(),
  }),
})


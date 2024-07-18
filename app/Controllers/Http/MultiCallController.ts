import {
  Multicall,
} from 'ethereum-multicall';
import Web3 from 'web3';
import BigNumber from "bignumber.js";

export default class MultiCallController {

  public async call(rpcUrl: string, contracts: string[], abis: Object[], methods: string[][], params: string[][][]) {
    const contractCallContext: any[] = this.makeCallRequest(contracts, abis, methods, params)
    const multiCall = this.createInstance(rpcUrl)

    const data = await multiCall.call(contractCallContext);

    const decodeRes = e => e?.hex ? new BigNumber(e.hex) : e
    const decodeCall = e => e.returnValues[1] ? e.returnValues.map(decodeRes) : decodeRes(e.returnValues[0])
    return Object.values(data.results).map(e => e.callsReturnContext[1] ? e.callsReturnContext.map(decodeCall) : decodeCall(e.callsReturnContext[0]))
  }

  private makeCallRequest(contracts: string[], abis: Object[], methods: string[][], params: string[][][]) {
    return contracts.map((contract, index) => ({
      reference: `contract[${index}]`,
      contractAddress: contract,
      abi: abis[index] || abis[0],
      calls: (params?.[index] || params?.[0]).map((e, i) => ({
        reference: `method[${i}]`,
        methodName: methods[index]?.[i] || methods[index]?.[0] || methods[0]?.[i] || methods[0]?.[0],
        methodParameters: e
      }))
    }))
  }

  private createInstance(rpcUrl) {
    const web3 = new Web3(rpcUrl);
    return new Multicall({web3Instance: web3, tryAggregate: true});
  }

  static manyToOne(rpcUrl: string, {contracts, abi, method, params = undefined}) {
    const multi = new this
    return multi.call(rpcUrl, contracts, [abi], [[method]], params ? [[Array.isArray(params) ? params : [params]]] : [[[]]])
  }

  static oneToMany(rpcUrl, {contract, abi, method, params}) {
    return this.call(rpcUrl, [contract], [[abi]], [[method]], [[params.map(e => [e])]])
  }

}

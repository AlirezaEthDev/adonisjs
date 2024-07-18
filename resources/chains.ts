export default [
  {
    "title": "BNB Smart Chain",
    "slug": "BNB",
    "chainId": 56,
    "rpcUrl": "https://bsc-dataseed1.binance.org",
    "router": "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4",
    "routerv2": "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    "factory": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    "cName": "BNB",
    "symbol": "BNB",
    "explorerUrl": "https://bscscan.com",
    "decimal": 18,
    "to": {
      "query": {
        "chain": "56"
      }
    },
    "icon": "bsc.png",
    "iconType": "img"
  },
  {
    title: 'Goerli test network',
    slug: "GoerliETH",
    chainId: 5,
    rpcUrl: 'https://eth-goerli.public.blastapi.io',
    cName: 'GoerliETH',
    symbol: 'GoerliETH',
    explorerUrl: 'https://goerli.etherscan.io',
    router: '0xEfF92A263d31888d860bD50809A8D171709b7b1c',
    routerv2: '0xEfF92A263d31888d860bD50809A8D171709b7b1c',
    factory: '0x1097053Fd2ea711dad45caCcc45EfF7548fCB362',
    decimal: 18,
    to: {
      query: {
        chain: '5'
      }
    },
    icon: 'eth.png',
    iconType: 'img'
  },
  {
    title: 'Binance Smart Chain Testnet',
    slug: "tBNB",
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s3.binance.org:8545',
    router: '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3',
    routerv2: '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3',
    factory: '0xB7926C0430Afb07AA7DEfDE6DA862aE0Bde767bc',
    cName: 'tBNB',
    symbol: 'tBNB',
    explorerUrl: 'https://testnet.bscscan.com',
    decimal: 18,
    to: {
      query: {
        chain: '97'
      }
    },
    icon: 'bsc.png',
    iconType: 'img'
  },
  {
    title: 'HolyChain',
    slug: "HETH",
    chainId: 1337,
    rpcUrl: 'https://holychain.apie.io',
    router: '',
    factory: '',
    cName: 'HETH',
    symbol: 'HETH',
    explorerUrl: 'https://explorer.apie.io',
    decimal: 18,
    to: {
      query: {
        chain: '1337'
      }
    },
    icon: 'eth.png',
    iconType: 'img'
  }
]

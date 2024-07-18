
import Route from '@ioc:Adonis/Core/Route'

Route.post('/trade', 'TradesController.trade')
Route.post('/transaction' ,'TradesController.transaction')
Route.post('/get-approve' ,'TradesController.getApprove')

Route.post('/liquidity/params', 'LiquidityController.liquidityParams')
Route.post('/liquidity/details', 'LiquidityController.liquidityDetails')
Route.post('/liquidity/data', 'LiquidityController.liquidityData')
Route.post('/liquidity/add' , 'LiquidityController.addLiquidity')
Route.post('/liquidity/balances' , 'LiquidityController.getLiquidity')
Route.post('/liquidity/permit-data' , 'LiquidityController.getPermitData')
Route.post('/liquidity/remove' , 'LiquidityController.remove')

Route.post('/tokens' ,'TokensController.index')
Route.post('/token/balance' ,'TokensController.getBalance')

Route.post('/order','OrdersController.store')
Route.put('/order/:id','OrdersController.update')
Route.delete('/order/:id','OrdersController.cancel')



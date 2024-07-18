import Ws from 'App/Services/Ws'
import OrdersController from "App/Controllers/Http/OrdersController";

Ws.boot()

Ws.io.use((socket, next) => {
  console.log(socket.request.headers)
  // next(new Error("Invalid apiKey"))
  // socket.data.userId = 1
  next()
})
Ws.io.on('connection', (socket) => {
  console.log('new connection : ', socket.id)
  socket.on('orders', async (data, res) => {
    // @ts-ignore
    const orders = await OrdersController.getOrders(...data)
    res(orders)
  })
  // console.log(socket.data.userId)
  // socket.on("error", () => socket.disconnect())
  // socket.join(socket.data.userId);
  // Ws.io.to(userId).emit('transaction', data)
})

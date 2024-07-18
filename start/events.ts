import Event from '@ioc:Adonis/Core/Event'
import Ws from "App/Services/Ws";
// @ts-ignore
import {OrderWhereInput} from ".prisma/client";
import OrdersController from "App/Controllers/Http/OrdersController";

Event.on('order', async (data) => {
  const orders = await OrdersController.getOrders(data[0],data[1],data[2])
  Ws.io.emit(`${data[0].symbol}:${data[1].symbol}:${data[2]}`, orders)
  Ws.io.emit(`${data[1].symbol}:${data[0].symbol}:${data[2]}`, orders)
})


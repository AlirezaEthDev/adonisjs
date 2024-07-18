import type {HttpContextContract} from '@ioc:Adonis/Core/HttpContext'
import {storeOrderSchema, updateOrderSchema} from "App/Validation/OrderSchema";
import {prisma} from '@ioc:Adonis/Addons/Prisma'
import BigNumber from "bignumber.js";
import Event from "@ioc:Adonis/Core/Event";
import {DateTime} from "luxon";

export default class OrdersController {
  public async index({}: HttpContextContract) {
  }

  public async store({request}: HttpContextContract) {
    const payload = await request.validate({schema: storeOrderSchema})
    const data = {
      ...payload,
      from: {
        set: payload.from
      },
      to: {
        set: payload.to
      }
    }
    // @ts-ignore
    const order = await prisma.order.create({
      // @ts-ignore
      data,
      select: {
        from: true,
        to: true,
      }
    })
    await Event.emit('order', [order.from, order.to, order.chainId])
    return order
  }

  public async update({request, params}: HttpContextContract) {
    const payload = await request.validate({schema: updateOrderSchema})
    const order = await prisma.order.findUniqueOrThrow({where: {id: params.id}})
    const updatedOrder = await prisma.order.update({
      where: {
        id: params.id
      },
      data: {
        filled: payload.filled,
        filledPercent: BigNumber(payload.filled).div(order.amount).times(100).toNumber()
      }
    })
    await Event.emit('order', [order.from, order.to, order.chainId])
    return updatedOrder
  }

  public async cancel({params}) {
    const order = await prisma.order.update({
      where: {
        id: params.id
      },
      data: {
        cancelled: true
      }
    })
    await Event.emit('order', [order.from, order.to, order.chainId])
    return order
  }

  static async getOrders(from, to, chainId) {
    const now = DateTime.now().toSeconds()
    return prisma.order.findMany({
      where: {
        deadline: {
          gt: now
        },
        filledPercent: {
          lt: 100
        },
        chainId,
        OR: [
          {
            from: {
              is: {
                address: from.address,
              }
            },
            to: {
              is: {
                address: to.address
              }
            }
          },
          {
            from: {
              is: {
                address: to.address,
              }
            },
            to: {
              is: {
                address: from.address
              }
            }
          },
        ]
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  }
}

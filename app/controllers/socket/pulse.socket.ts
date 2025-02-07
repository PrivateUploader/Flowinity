import {
  ConnectedSocket,
  MessageBody,
  OnConnect,
  OnMessage,
  SocketController
} from "socket-controllers"
import { Service } from "typedi"
import { SocketAuth } from "@app/types/socket"
import {
  Pulse as PulseClass,
  SinglePulse
} from "@app/classes/socket/pulse/pulse"
import { Pulse } from "@app/models/pulse.model"
import { SocketAuthMiddleware } from "@app/lib/socket-auth"
import { SocketNamespaces } from "@app/classes/graphql/SocketEvents"

@SocketController("/pulse")
@Service()
export class PulseSocketController {
  constructor(private socketAuthMiddleware: SocketAuthMiddleware) {}
  private nsp = SocketNamespaces.PULSE
  @OnConnect()
  async onConnect(@ConnectedSocket() socket: SocketAuth) {
    const session = await this.socketAuthMiddleware.use(
      socket,
      () => {},
      this.nsp
    )
    if (session) {
      socket.join(session.user.id)
    }
  }

  @OnMessage("startPulse")
  async startPulse(
    @ConnectedSocket() socket: SocketAuth,
    @MessageBody() data: PulseClass
  ) {
    if (!socket.request.user[this.nsp]) return
    try {
      if (data.type === "gallery") {
        const pulse = await Pulse.create({
          userId: socket.request.user[this.nsp].id,
          action: "focus",
          route: "/gallery",
          timeSpent: 0,
          device: data.device,
          sysInfo: data.sysInfo,
          name: data.name,
          other: data.other
        })

        socket.emit("pulseToken-" + data.id, {
          id: pulse.id
        })
      } else if (data.type === "global") {
        const pulse: Pulse = await Pulse.create({
          userId: socket.request.user[this.nsp].id,
          action: "focus",
          route: data.route,
          timeSpent: 0,
          device: data.device,
          sysInfo: data.sysInfo,
          name: data.name,
          other: data.other
        })

        socket.emit("pulseToken-" + data.id, {
          id: pulse.id
        })
      }
    } catch (err) {
      console.error(err)
      console.error("Error creating pulse.")
    }
  }

  @OnMessage("pulse")
  async pulse(
    @ConnectedSocket() socket: SocketAuth,
    @MessageBody() data: SinglePulse
  ) {
    if (!socket.request.user[this.nsp]) return
    try {
      if (data.timeSpent > 3600000) return
      await Pulse.create({
        userId: socket.request.user[this.nsp].id,
        action: data.action,
        route: data.route,
        timeSpent: data.timeSpent || 0,
        device: data.device,
        sysInfo: data.sysInfo,
        name: data.name,
        other: data.other
      })
    } catch {
      console.log("error creating pulse")
      socket.emit("error", {
        message: "Error creating pulse."
      })
    }
  }

  @OnMessage("updatePulse")
  async updatePulse(
    @ConnectedSocket() socket: SocketAuth,
    @MessageBody() data: SinglePulse
  ) {
    if (!socket.request.user[this.nsp]) return
    try {
      const pulse: Pulse | null = await Pulse.findOne({
        where: {
          id: data.id,
          userId: socket.request.user[this.nsp].id
        }
      })

      if (pulse) {
        if (data.timeSpent < pulse.timeSpent) return
        if (data.timeSpent - pulse.timeSpent > 600000) return

        await pulse.update({
          timeSpent: data.timeSpent
        })
      }
    } catch (e) {
      console.error("Error updating pulse.", e)
    }
  }
}

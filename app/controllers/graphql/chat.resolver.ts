import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root
} from "type-graphql"
import { Service } from "typedi"
import { Chat } from "@app/models/chat.model"
import { Context } from "@app/types/graphql/context"
import { ChatAssociation } from "@app/models/chatAssociation.model"
import { Authorization } from "@app/lib/graphql/AuthChecker"
import {
  partialUserBase,
  PartialUserBase
} from "@app/classes/graphql/user/partialUser"
import { User } from "@app/models/user.model"
import { LegacyUser } from "@app/models/legacyUser.model"
import { Op } from "sequelize"
import { CreateChatInput } from "@app/classes/graphql/chat/createChat"
import RateLimit from "@app/lib/graphql/RateLimit"
import { ChatService } from "@app/services/chat.service"
import { UpdateChatInput } from "@app/classes/graphql/chat/updateChat"
import { ChatInput, ChatsInput } from "@app/classes/graphql/chat/chat"
import { GraphQLError } from "graphql/error"
import { ChatRank } from "@app/models/chatRank.model"
import { ChatPermission } from "@app/models/chatPermission.model"
import {
  DangerZoneChatInput,
  TransferOwnershipInput
} from "@app/classes/graphql/chat/deleteChat"
import { ChatPermissions } from "@app/classes/graphql/chat/ranks/permissions"
import { AuthService } from "@app/services/auth.service"
import { Message } from "@app/models/message.model"
import { SocketNamespaces } from "@app/classes/graphql/SocketEvents"
import { ChatRankAssociation } from "@app/models/chatRankAssociation.model"
import { ChatPermissionAssociation } from "@app/models/chatPermissionAssociation.model"
import { Success } from "@app/classes/graphql/generic/success"
import { ChatInvite } from "@app/models/chatInvite.model"

@Resolver(Chat)
@Service()
export class ChatResolver {
  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  @Authorization({
    scopes: ["chats.view"],
    userOptional: true
  })
  @Query(() => [Chat])
  async chats(
    @Ctx() ctx: Context,
    @Arg("input", { nullable: true }) input?: ChatsInput
  ) {
    if (!ctx.user) return []
    return await Chat.findAll({
      include: [
        {
          model: ChatAssociation,
          where: { userId: ctx.user.id, hidden: !!input?.hidden },
          required: true,
          as: "association"
        }
      ]
    })
  }

  @FieldResolver(() => Int)
  async unread(@Root() chat: Chat, @Ctx() ctx: Context): Promise<Number> {
    const unreads = await redis.json.get(`unread:${ctx.user?.id || 0}`)
    return unreads?.[chat.id.toString()] || 0
  }

  @Authorization({
    scopes: ["chats.view"]
  })
  @Query(() => Chat)
  async chat(@Ctx() ctx: Context, @Arg("input") input: ChatInput) {
    if (!ctx.user) return null
    if (!input.chatId && !input.associationId)
      throw new GraphQLError("Field `chatId` or `associationId` is required.")

    const where = input.chatId
      ? { id: input.chatId }
      : { id: input.associationId, userId: ctx.user.id }

    return await Chat.findOne({
      where: input.chatId ? where : {},
      include: [
        {
          model: ChatAssociation,
          where: input.chatId ? { userId: ctx.user.id } : where,
          required: true,
          as: "association"
        }
      ]
    })
  }

  @FieldResolver(() => PartialUserBase)
  async user(@Root() chat: Chat): Promise<PartialUserBase> {
    return (await chat.$get("user", {
      attributes: partialUserBase
    })) as PartialUserBase
  }

  @FieldResolver(() => PartialUserBase)
  async legacyUser(@Root() chat: Chat): Promise<PartialUserBase> {
    return (await chat.$get("legacyUser", {
      attributes: partialUserBase
    })) as PartialUserBase
  }

  @FieldResolver(() => [ChatAssociation])
  async users(@Root() chat: Chat) {
    return await chat.$get("users")
  }

  @FieldResolver(() => String)
  async _redisSortDate(@Root() chat: Chat) {
    return (await redis.get(`chat:${chat.id}:sortDate`)) || "0"
  }

  @FieldResolver(() => PartialUserBase || null, {
    nullable: true
  })
  async recipient(
    @Root() chat: Chat,
    @Ctx() ctx: Context
  ): Promise<PartialUserBase | null> {
    if (chat.type !== "direct" || !ctx.user) return null
    const user = await ChatAssociation.findOne({
      attributes: ["userId", "legacyUserId", "user"],
      where: {
        chatId: chat.id,
        userId: {
          [Op.ne]: ctx.user.id
        }
      },
      include: [
        {
          model: User,
          as: "tpuUser",
          attributes: partialUserBase
        },
        {
          model: LegacyUser,
          as: "legacyUser",
          attributes: partialUserBase
        }
      ]
    })
    return user?.user as PartialUserBase | null
  }

  @RateLimit({
    window: 10,
    max: 3
  })
  @Authorization({
    scopes: ["chats.create"]
  })
  @Mutation(() => Chat)
  async createChat(
    @Ctx() ctx: Context,
    @Arg("input") input: CreateChatInput
  ): Promise<Chat> {
    return await this.chatService.createChat(input.users, ctx.user!!.id)
  }

  @RateLimit({
    window: 10,
    max: 10
  })
  @Authorization({
    scopes: ["chats.edit"]
  })
  @Mutation(() => Chat)
  async updateChat(@Ctx() ctx: Context, @Arg("input") input: UpdateChatInput) {
    if (
      (input.icon !== null && input.icon !== undefined) ||
      (input.background !== undefined && input.background !== null)
    ) {
      throw new GraphQLError(
        "If you are trying to set the group icon/background, please use the REST API."
      )
    }
    if (input.name === null) {
      throw new GraphQLError("The group name must be undefined or be a string.")
    }
    await this.chatService.updateGroupSettings(
      input.associationId,
      ctx.user!!.id,
      input
    )

    return this.chat(ctx, {
      associationId: input.associationId
    })
  }

  @FieldResolver(() => [ChatRank])
  async ranks(@Root() chat: Chat) {
    return await chat.$get("ranks", {
      order: [["index", "DESC"]]
    })
  }

  @Query(() => [ChatPermission])
  async availableChatPermissions() {
    return await ChatPermission.findAll()
  }

  @RateLimit({
    window: 10,
    max: 10
  })
  @Authorization({
    scopes: ["*"]
  })
  @Mutation(() => Success)
  async deleteGroup(
    @Ctx() ctx: Context,
    @Arg("input") input: DangerZoneChatInput
  ) {
    if (!input.totp && !input.password) {
      throw new GraphQLError(
        "You must either enter your password or 2FA token to continue."
      )
    }
    await this.chatService.checkPermissions(
      ctx.user!!.id,
      input.associationId,
      ChatPermissions.OWNER
    )
    const chat = await this.chatService.getChatFromAssociation(
      input.associationId,
      ctx.user!!.id
    )
    await this.authService.validateAuthMethod({
      userId: ctx.user!!.id,
      credentials: {
        password: input.password,
        totp: input.totp
      },
      totp: !!input.totp,
      password: !!input.password,
      alternatePassword: false
    })
    for (const association of chat.users) {
      await association.destroy()
      await ChatRankAssociation.destroy({
        where: {
          chatAssociationId: association.id
        }
      })
      if (!association.userId) continue
      let unread: Record<string, string> = await redis.json.get(
        `unread:${association.userId}`
      )
      delete unread[chat.id.toString()]
      await redis.json.set(`unread:${association.userId}`, "$", unread)
      socket
        .of(SocketNamespaces.CHAT)
        .to(association.userId)
        .emit("removeChat", {
          id: chat.id
        })
    }
    await Message.destroy({
      where: {
        chatId: chat.id
      }
    })
    const ranks = await ChatRank.findAll({
      where: {
        chatId: chat.id
      }
    })
    await ChatPermissionAssociation.destroy({
      where: {
        rankId: ranks.map((rank) => rank.id)
      }
    })
    await ChatRank.destroy({
      where: {
        chatId: chat.id
      }
    })
    await Chat.destroy({
      where: {
        id: chat.id
      }
    })
    return {
      success: true
    }
  }

  @FieldResolver(() => [ChatInvite])
  async invites(@Root() chat: Chat, @Ctx() ctx: Context) {
    try {
      const permissions = await this.chatService.checkPermissions(
        ctx.user!!.id,
        chat?.association?.id,
        ChatPermissions.OVERVIEW
      )
      const highestRank = await this.chatService.getHighestIndex(
        chat?.association?.id
      )
      const invites = await chat.$get("invites", {
        where: {
          invalidated: false,
          expiredAt: {
            [Op.or]: [
              {
                [Op.gt]: new Date()
              },
              {
                [Op.is]: null
              }
            ]
          }
        },
        include: [
          {
            model: ChatRank,
            as: "rank"
          }
        ]
      })
      if (!permissions.includes(ChatPermissions.OWNER)) {
        for (const invite of invites) {
          if (!invite.rank) continue
          if (invite.rank.index >= highestRank) {
            const index = invites.indexOf(invite)
            invites.splice(index, 1)
          }
        }
      }
      return invites
    } catch {
      return []
    }
  }

  @FieldResolver(() => [Message])
  async messages() {
    return []
  }

  @RateLimit({
    window: 10,
    max: 10
  })
  @Authorization({
    scopes: ["*"]
  })
  @Mutation(() => Chat)
  async transferGroupOwnership(
    @Ctx() ctx: Context,
    @Arg("input") input: TransferOwnershipInput
  ) {
    if (!input.totp && !input.password) {
      throw new GraphQLError(
        "You must either enter your password or 2FA token to continue."
      )
    }
    await this.chatService.checkPermissions(
      ctx.user!!.id,
      input.associationId,
      ChatPermissions.OWNER
    )
    const chat = await this.chatService.getChatFromAssociation(
      input.associationId,
      ctx.user!!.id
    )
    await this.authService.validateAuthMethod({
      userId: ctx.user!!.id,
      credentials: {
        password: input.password,
        totp: input.totp
      },
      totp: !!input.totp,
      password: !!input.password,
      alternatePassword: false
    })
    const remoteAssociation = await ChatAssociation.findOne({
      where: {
        chatId: chat.id,
        userId: input.userId
      }
    })
    if (!remoteAssociation) throw new GraphQLError("User is not in group.")
    await chat.update({
      userId: input.userId
    })
    await this.chatService.getPermissions(
      ctx.user!!.id,
      input.associationId,
      true
    )
    await this.chatService.getPermissions(
      input.userId,
      remoteAssociation.id,
      true
    )
    this.chatService.emitForAll(
      remoteAssociation.id,
      remoteAssociation.userId,
      "chatUpdate",
      {
        id: chat.id,
        userId: remoteAssociation.userId
      }
    )
    return {
      ...chat,
      userId: remoteAssociation.userId
    }
  }
}
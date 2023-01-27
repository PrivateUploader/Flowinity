import { Service } from "typedi"
import { User } from "@app/models/user.model"
import Errors from "@app/lib/errors"
import { Invite } from "@app/models/invite.model"
import { Upload } from "@app/models/upload.model"
import { CollectionItem } from "@app/models/collectionItem.model"
import { InviteFacts } from "@app/types/invite"

@Service()
export class InviteService {
  async createInvite(userId: number, email: string): Promise<Invite> {
    return await Invite.create({
      userId,
      email
    })
  }

  async useInvite(inviteKey: string, userId: number): Promise<boolean> {
    await Invite.update(
      {
        registerUserId: userId
      },
      {
        where: {
          inviteKey
        }
      }
    )
    return true
  }

  async getInviteCache(inviteKey: string): Promise<InviteFacts> {
    const cache = await redis.json.get(`invites:${inviteKey}`)
    if (cache) {
      console.log(cache)
      return cache
    }

    const invite = {
      ...(await this.getInvite(inviteKey)).toJSON(),
      facts: await this.getFacts(inviteKey)
    }
    redis.json.set(`invites:${inviteKey}`, "$", invite, "EX", 43200)
    return invite
  }

  async getInvite(inviteKey: string): Promise<Invite> {
    const invite = await Invite.findOne({
      where: {
        inviteKey
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username"]
        }
      ]
    })

    if (!invite) {
      throw Errors.INVITE_NOT_FOUND
    }

    return invite
  }

  async getFacts(inviteKey: string): Promise<string[]> {
    let result = []

    const invite = await Invite.findOne({
      where: {
        inviteKey
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "avatar"]
        }
      ]
    })
    if (!invite) throw Errors.INVITE_NOT_FOUND
    // user-uploads
    const userUploads = await Upload.count({
      where: {
        userId: invite.userId
      }
    })
    result.push(
      `${invite.user.username} has uploaded ${userUploads} items to TPU.`
    )
    // user-percentage
    const uploads = await Upload.count()
    result.push(
      `${invite.user.username} has uploaded ${
        Math.round((userUploads / uploads) * 10000) / 100 + "%"
      } of the total uploads to TPU.`
    )
    // total-uploads
    result.push(`TPU has a total of ${uploads} uploads.`)
    // total-collectivized
    const collectionItems = await CollectionItem.findAll({
      attributes: ["userId"]
    })
    const totalCollectivized = collectionItems.filter(
      (item) => item.userId === invite.userId
    ).length
    result.push(
      `${invite.user.username} has put ${totalCollectivized} items in TPU collections.`
    )
    result.push(
      `${totalCollectivized} items have been collectivized out of ${collectionItems.length} total items.`
    )
    return result
  }
}
import { Arg, Ctx, FieldResolver, Query, Resolver, Root } from "type-graphql"
import { Service } from "typedi"
import { Context } from "@app/types/graphql/context"
import {
  partialUserFriend,
  PartialUserFriend
} from "@app/classes/graphql/user/partialUser"
import { Authorization } from "@app/lib/graphql/AuthChecker"
import { Friend } from "@app/models/friend.model"
import { FriendStatus } from "@app/classes/graphql/user/friends"
import { UserStatus } from "@app/classes/graphql/user/status"
import { FriendsInput } from "@app/classes/graphql/friends/getFriends"

@Resolver(Friend)
@Service()
export class FriendResolver {
  @Authorization({
    scopes: "user.view",
    userOptional: true
  })
  @Query(() => [Friend])
  async friends(
    @Ctx() ctx: Context,
    @Arg("input", { nullable: true }) input?: FriendsInput
  ) {
    if (!ctx.user) return []
    return await Friend.findAll({
      where: {
        userId: ctx.user!!.id,
        status: input?.status ? input.status.toLowerCase() : "accepted"
      }
    })
  }

  @FieldResolver(() => PartialUserFriend)
  async user(@Root() friend: Friend) {
    // These are flipped around intentionally, as "user" makes more sense to be the friend.
    const fr = await friend.$get("otherUser", {
      attributes: partialUserFriend
    })
    if (friend.status !== FriendStatus.ACCEPTED && fr)
      fr.status = UserStatus.UNKNOWN
    return fr
  }

  @FieldResolver(() => PartialUserFriend)
  async otherUser(@Root() friend: Friend) {
    return await friend.$get("user", {
      attributes: partialUserFriend
    })
  }
}

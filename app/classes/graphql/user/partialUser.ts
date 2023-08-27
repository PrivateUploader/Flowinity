import { Field, Float, GraphQLISODateTime, ObjectType } from "type-graphql"
import { DateTimeResolver } from "graphql-scalars"
import { DateType } from "@app/classes/graphql/serializers/date"
import { Badge } from "@app/models/badge.model"
import { Friend } from "@app/models/friend.model"
import { Plan } from "@app/models/plan.model"
import { Platform } from "@app/classes/graphql/user/platforms"
import { ProfileLayout } from "@app/classes/graphql/user/profileLayout"
import { Stats } from "@app/classes/graphql/core/core"
import { ThemeEngine } from "@app/classes/graphql/user/themeEngine"
import { UserInsights } from "@app/classes/graphql/user/insights"
import { FriendStatus } from "@app/classes/graphql/user/friends"
import { UserStatus } from "@app/classes/graphql/user/status"

@ObjectType()
export class PartialUserBase {
  @Field()
  username: string
  @Field()
  id: number
  @Field(() => DateType)
  createdAt: Date
  @Field()
  administrator: boolean
  @Field()
  moderator: boolean
  @Field({
    nullable: true
  })
  avatar: string
}

export const partialUserBase = [
  "username",
  "id",
  "createdAt",
  "administrator",
  "moderator",
  "avatar"
]

@ObjectType()
export class PartialUserPublic {
  @Field()
  username: string
  @Field()
  id: number
  @Field(() => DateType)
  createdAt: Date
  @Field()
  administrator: boolean
  @Field()
  moderator: boolean
  @Field({
    nullable: true
  })
  avatar: string
  @Field(() => [Badge])
  badges: Badge[]
  @Field()
  banned: boolean
  @Field({
    nullable: true
  })
  banner: string
  @Field({
    nullable: true
  })
  description: string
  @Field(() => FriendStatus, {
    nullable: true
  })
  friend: FriendStatus
  @Field(() => [Friend], {
    nullable: true
  })
  friends: Friend[]
  @Field(() => UserInsights)
  insights: "everyone" | "friends" | "none"
  @Field(() => Plan)
  plan: Plan
  @Field(() => [Platform], {
    nullable: true
  })
  platforms: Platform[]
  @Field(() => ProfileLayout, {
    nullable: true
  })
  profileLayout: ProfileLayout
  @Field()
  publicProfile: boolean
  @Field(() => Float)
  quota: bigint
  @Field(() => Stats, {
    nullable: true
  })
  stats: Stats
  @Field(() => ThemeEngine, {
    nullable: true
  })
  themeEngine: ThemeEngine
  @Field({
    nullable: true
  })
  xp: number
}

export const partialUserPublic = [
  "username",
  "id",
  "createdAt",
  "administrator",
  "moderator",
  "avatar",
  "banned",
  "banner",
  "description",
  "insights",
  "plan",
  "profileLayout",
  "publicProfile",
  "quota",
  "themeEngine",
  "xp"
]

@ObjectType()
export class PartialUserFriend extends PartialUserBase {
  @Field(() => UserStatus)
  status: UserStatus
}

export const partialUserFriend = [...partialUserBase, "status"]
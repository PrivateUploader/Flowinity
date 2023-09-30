import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root
} from "type-graphql"
import { UserUtilsService } from "@app/services/userUtils.service"
import { User } from "@app/models/user.model"
import { Service } from "typedi"
import { Context } from "@app/types/graphql/context"
import { GraphQLScalarType } from "graphql/type"
import { Upload } from "@app/models/upload.model"
import { GalleryInput, Type } from "@app/classes/graphql/gallery/galleryInput"
import { Collection } from "@app/models/collection.model"
import { GalleryService } from "@app/services/gallery.service"
import { PaginatedGalleryResponse } from "@app/classes/graphql/gallery/galleryResponse"
import { CollectionItem } from "@app/models/collectionItem.model"
import { GraphQLError } from "graphql/error"
import { CollectionService } from "@app/services/collection.service"
import { Authorization } from "@app/lib/graphql/AuthChecker"
//@ts-ignore
import { resolver } from "graphql-sequelize"
import { CollectionUser } from "@app/models/collectionUser.model"
import { Op } from "sequelize"

const FileScalar = new GraphQLScalarType({
  name: "File",
  description: "File custom scalar type"
})

@Resolver(Upload)
@Service()
export class GalleryResolver {
  constructor(
    private galleryService: GalleryService,
    private userService: UserUtilsService,
    private collectionService: CollectionService
  ) {}

  @Authorization({
    scopes: ["uploads.view", "collections.view"],
    userOptional: true
  })
  @Query(() => PaginatedGalleryResponse)
  async gallery(
    @Ctx() ctx: Context,
    @Arg("input")
    input: GalleryInput
  ) {
    if (input.type === Type.COLLECTION) {
      if (!input.collectionId && !input.shareLink)
        throw new GraphQLError(
          "Collection ID or ShareLink is required for collection gallery"
        )
      const collection = await this.collectionService.getCollectionOrShare(
        input.collectionId || input.shareLink!!,
        ctx.user?.id
      )
      if (!collection)
        throw new GraphQLError(
          "You don't have permission to view this collection"
        )
      input.collectionId = collection.id
    } else if (input.type === Type.AUTO_COLLECT) {
      if (!input.collectionId)
        throw new GraphQLError(
          "You must specify `collectionId` for AutoCollects."
        )
      const collection = await this.collectionService.getCollectionOrShare(
        input.collectionId,
        ctx.user?.id
      )
      if (!collection)
        throw new GraphQLError(
          "You don't have permission to view this collection"
        )
    } else if (!ctx.user) {
      throw new GraphQLError("You must be logged in to view the gallery")
    }
    return await this.galleryService.getGalleryV4(
      ctx.user?.id,
      input,
      ctx.user?.itemsPerPage || input.limit || 12,
      ctx.user?.id
        ? await this.userService.getAttribute(
            ctx.user.id,
            "excludedCollections"
          )
        : null
    )
  }

  @FieldResolver(() => [Collection])
  async collections(@Root() upload: Upload, @Ctx() ctx: Context) {
    if (!ctx.user) return []
    return await upload.$get("collections", {
      where: {
        [Op.or]: [
          {
            userId: ctx.user!!.id
          },
          {
            "$recipient.recipientId$": ctx.user.id
          }
        ]
      },
      include: [
        {
          model: CollectionUser,
          as: "recipient",
          attributes: ["recipientId"],
          required: false,
          where: {
            recipientId: ctx.user.id
          }
        }
      ]
    })
  }

  @FieldResolver(() => User)
  async user(@Root() upload: Upload) {
    return await upload.$get("user")
  }

  @FieldResolver(() => CollectionItem)
  async items(@Root() upload: Upload) {
    return await upload.$get("items")
  }

  @Mutation(() => Upload)
  async upload(@Ctx() ctx: Context, @Arg("file", () => FileScalar) file: any) {
    console.log(file)
  }
}
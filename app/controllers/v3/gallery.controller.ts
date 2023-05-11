import {
  Body,
  Delete,
  Get,
  JsonController,
  Param,
  Post,
  Put,
  QueryParam,
  UseBefore,
  UploadedFile,
  Req,
  UploadedFiles
} from "routing-controllers"
import { Service } from "typedi"
import { Auth } from "@app/lib/auth"
import { User } from "@app/models/user.model"
import Errors from "@app/lib/errors"
import { GalleryService } from "@app/services/gallery.service"
import rateLimits, { standardLimiter } from "@app/lib/rateLimits"
import { AutoCollectService } from "@app/services/autoCollect.service"
import { CacheService } from "@app/services/cache.service"
import { AutoCollectRule } from "@app/models/autoCollectRule.model"
import { SortOptions } from "@app/types/sort"
import { AutoCollectApproval } from "@app/models/autoCollectApproval.model"
import queue from "@app/lib/queue"
import uploader from "@app/lib/upload"
import { RequestAuth } from "@app/types/express"
import { OpenAPI } from "routing-controllers-openapi"
@Service()
@JsonController("/gallery")
export class GalleryControllerV3 {
  constructor(
    private readonly galleryService: GalleryService,
    private readonly cacheService: CacheService
  ) {}

  @Get("")
  @Get("/starred")
  async getUserGallery(
    @Auth("uploads.view") user: User,
    @QueryParam("page") page: number = 1,
    @QueryParam("sort") sort: SortOptions = "newest",
    @QueryParam("search") search: string = "",
    @QueryParam("array") array: boolean = false,
    @QueryParam("textMetadata") textMetadata: boolean = false,
    @QueryParam("filter") filter: string = "",
    @Req() req: RequestAuth
  ) {
    return await this.galleryService.getGallery(
      user.id,
      page,
      search,
      filter,
      textMetadata,
      req.path.includes("/starred") ? "starred" : "user",
      user.itemsPerPage,
      sort,
      array
    )
  }

  @Post("")
  @UseBefore(rateLimits.uploadLimiter)
  async upload(
    @Auth("uploads.create") user: User,
    @UploadedFile("attachment", {
      options: uploader
    })
    attachment: Express.Multer.File
  ) {
    if (!attachment) throw Errors.NO_FILE
    const upload = await this.galleryService.createUpload(
      user.id,
      attachment,
      user.discordPrecache
    )
    socket.to(user.id).emit("gallery/create", upload)
    return upload
  }

  @Post("/upload")
  @OpenAPI({ deprecated: true, description: "Upload API for legacy clients" })
  @UseBefore(rateLimits.uploadLimiter)
  async uploadLegacy(
    @Auth("uploads.create") user: User,
    @UploadedFile("attachment", {
      options: uploader
    })
    attachment: Express.Multer.File
  ) {
    return await this.upload(user, attachment)
  }

  @Get("/starred/random")
  async getRandomStarred(@Auth("uploads.view") user: User) {
    return await this.galleryService.getRandomAttachment(user.id, "starred")
  }

  @Get("/random")
  async getRandom(@Auth("uploads.view") user: User) {
    return await this.galleryService.getRandomAttachment(user.id, "user")
  }

  @Post("/site")
  @UseBefore(rateLimits.uploadLimiter)
  async uploadSite(
    @Auth("uploads.create") user: User,
    @UploadedFiles("attachments", {
      options: uploader
    })
    attachments: Express.Multer.File[]
  ) {
    let files = []
    for (const attachment of attachments) {
      files.push(
        await this.galleryService.createUpload(user.id, attachment, false)
      )
    }
    socket.to(user.id).emit("gallery/create", files)
    return files
  }

  @Delete("/:id")
  async deleteUpload(
    @Auth("uploads.modify") user: User,
    @Param("id") id: number
  ) {
    await this.galleryService.deleteUpload(id, user.id)
  }

  // bulk delete
  @Post("/delete")
  async deleteUploads(
    @Auth("uploads.modify") user: User,
    @Body() body: { items: number[] }
  ) {
    if (!body.items.length || body.items.length > 24) {
      throw Errors.TOO_MANY_ITEMS_DELETE
    }
    for (const id of body.items) {
      await this.galleryService.deleteUpload(id, user.id)
    }
  }

  @Post("/star/:attachment")
  async starUpload(
    @Auth("uploads.modify") user: User,
    @Param("attachment") attachment: string
  ) {
    return {
      status: await this.galleryService.starUpload(attachment, user.id)
    }
  }

  @Get("/:attachment")
  async getUpload(
    @Auth("uploads.view") user: User,
    @Param("attachment") attachment: string
  ) {
    return await this.galleryService.getAttachment(attachment, user.id)
  }
}
import { AuthChecker, Authorized, ResolverData } from "type-graphql"
import { Context } from "@app/types/graphql/context"
import { AccessLevel } from "@app/enums/admin/AccessLevel"
import { checkScope, Scope } from "@app/lib/auth"
import { GraphQLError } from "graphql/error"
import { Container } from "typedi"
import { UserResolver } from "@app/controllers/graphql/user.resolver"

export interface AuthCheckerOptions {
  scopes: Scope[] | Scope
  userOptional?: boolean
  accessLevel?: AccessLevel
}

export const Authorization = (options: AuthCheckerOptions) =>
  Authorized(options)

export const authChecker: AuthChecker<Context> = async (
  { root, args, context, info }: ResolverData<Context>,
  options: any[]
) => {
  const userResolver = Container.get(UserResolver)
  const token = context.token
  const session = await userResolver.findByToken(token)
  const user = session?.user
  const opts = options[0] as AuthCheckerOptions
  context.user = user
  if (!user && !opts.userOptional) {
    throw new GraphQLError(
      `You need to be logged in to do this (Authorization header is empty or invalid).`,
      {
        extensions: {
          code: "UNAUTHORIZED"
        }
      }
    )
  }
  const scopes = context.scopes
  if (!opts.scopes)
    throw new GraphQLError(
      "Please check code! Auth checker options object is not valid!"
    )
  if (!checkScope(opts.scopes, scopes)) {
    if (!opts.userOptional) {
      throw new GraphQLError(
        `Invalid scopes for API key (scope required: ${opts.scopes}, scopes granted: ${scopes}).`,
        {
          extensions: {
            code: "SCOPE_REQUIRED"
          }
        }
      )
    }
    context.user = null
    return true
  }
  return true
}

import { AdminService } from "@app/services/admin.service"
import { Service } from "typedi"
import { User } from "@app/models/user.model"
import { Invite } from "@app/models/invite.model"

@Service()
export class EmailNotificationService {
  constructor(private readonly adminService: AdminService) {}

  async banUnderagedUserNotification(userId: number) {
    const user = await User.findOne({
      where: {
        id: userId
      },
      attributes: ["id", "username", "email", "dateOfBirth"]
    })

    if (!user) return

    this.adminService.sendEmail(
      {
        body: {
          name: user.username,
          intro: `Your account has been suspended as you are under 13 years of age. You must be over 13 years of age to use Flowinity.<br>If you do nothing within 14 days, your account will be permanently deleted, including your files, Workspaces, and other information. Your chat messages will be anonymized.`,
          action: [
            {
              instructions:
                "If you accidentally entered the wrong date of birth, please contact us using the button below, or use the email help@flowinity.com.",
              button: {
                color: "#0190ea", // Optional action button color
                text: "Contact us",
                link: "mailto:help@flowinity.com"
              }
            }
          ]
        }
      },
      user.email,
      "Your account has been suspended"
    )
  }

  async confirmDeleteAccountNotification(userId: number) {
    const user = await User.findOne({
      where: {
        id: userId
      },
      attributes: ["id", "username", "email"]
    })

    if (!user) return

    this.adminService.sendEmail(
      {
        body: {
          name: user.username,
          intro: `You have requested to delete your account. If you do nothing within 14 days, your account will be permanently deleted, including your files, Workspaces, and other information. Your chat messages will be anonymized.`,
          action: [
            {
              instructions:
                "Want to reactivate your account? You can do so within 14 days by logging in.",
              button: {
                color: "#0190ea", // Optional action button color
                text: "Login",
                link: `${config.hostnameWithProtocol}/login`
              }
            },
            {
              instructions:
                "If you have any questions, please contact us using the button below, or use the email help@flowinity.com. Please note we cannot recover the account after it has been permanently deleted.",
              button: {
                color: "#0190ea", // Optional action button color
                text: "Contact us",
                link: "mailto:help@flowinity.com"
              }
            }
          ]
        }
      },
      user.email,
      "Your account will be deleted in 14 days"
    )
  }

  // If the user's account is to be deleted in 48 hours
  async warnDeleteAccountNotification(userId: number) {
    const user = await User.findOne({
      where: {
        id: userId
      },
      attributes: ["id", "username", "email"]
    })

    if (!user) return

    this.adminService.sendEmail(
      {
        body: {
          name: user.username,
          intro: `You have requested to delete your account. Your account will be permanently deleted in 48 hours, including your files, Workspaces, and your chat messages will be anonymized if you do nothing within this period.`,
          action: [
            {
              instructions:
                "Want to reactivate your account? You can do so within 48 hours by logging in.",
              button: {
                color: "#0190ea", // Optional action button color
                text: "Login",
                link: `${config.hostnameWithProtocol}/login`
              }
            },
            {
              instructions:
                "If you have any questions, please contact us using the button below, or use the email help@flowinity.com. Please note we cannot recover the account after it has been permanently deleted.",
              button: {
                color: "#0190ea", // Optional action button color
                text: "Contact us",
                link: "mailto:help@flowinity.com"
              }
            }
          ]
        }
      },
      user.email,
      "Your account will be deleted in 48 hours"
    )
  }

  async inviteAFriendAccept(invite: Invite) {
    const user = await invite.$get("user", {
      attributes: ["username"]
    })
    if (!user) return
    this.adminService.sendEmail(
      {
        body: {
          intro: `Your friend ${user.username} has invited you to join ${config.siteName}`,
          action: [
            {
              instructions: `${config.siteName} is a free invite-only image and file hosting service.`,
              button: {
                color: "#0190ea", // Optional action button color
                text: "Create your account",
                link:
                  config.hostnameWithProtocol + "/register/" + invite.inviteKey
              }
            },
            {
              instructions: `Want to learn more about the advantages of ${config.siteName}?`,
              button: {
                color: "#0190ea", // Optional action button color
                text: "Learn more",
                link: config.hostnameWithProtocol
              }
            }
          ],
          outro:
            "If you do not intend to create an account, you can ignore this email."
        }
      },
      invite.email,
      `Your friend ${user.username} has invited you to join ${config.siteName}!`
    )
  }
}

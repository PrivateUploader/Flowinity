// Utilities
import { defineStore } from "pinia";
import axios from "@/plugins/axios";
import { useFriendsStore } from "@/store/friends.store";
import { useAppStore } from "@/store/app.store";
import { useToast } from "vue-toastification";
import vuetify from "@/plugins/vuetify";
import i18n from "@/plugins/i18n";
import functions from "@/plugins/functions";
import { GetUserQuery } from "@/graphql/user/user.graphql";
import { UpdateUserMutation } from "@/graphql/user/update.graphql";
import {
  BlockedUser,
  PartialUserFriend,
  UpdateUserInput,
  User,
  UserStoredStatus
} from "@/gql/graphql";
import { ProfileQuery } from "@/graphql/user/profile.graphql";
import { BlockUserMutation } from "@/graphql/user/blockUser.graphql";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null as User | null,
    _postInitRan: false,
    changes: {
      themeEngine: {
        customCSS: ""
      }
    } as Partial<User>,
    actions: {
      emailSent: {
        value: false,
        loading: false
      }
    },
    dialogs: {
      block: {
        userId: undefined as number | undefined,
        value: false,
        silent: false,
        username: ""
      }
    },
    defaultVuetify: null as any,
    disableProfileColors:
      localStorage.getItem("disableProfileColors") === "true",
    tracked: [] as PartialUserFriend[],
    blocked: [] as BlockedUser[]
  }),
  getters: {
    contrast() {
      return functions.contrast(vuetify.theme.current.value.colors.primary);
    },
    theme() {
      return vuetify.theme.current.value;
    },
    gold(state) {
      if (!state.user) return false;
      return state.user.plan.internalName === "GOLD";
    },
    unreadNotifications(state) {
      if (!state.user) return 0;
      return state.user.notifications.filter((n) => !n.dismissed).length;
    },
    users(): Record<number, PartialUserFriend> {
      return this.tracked.reduce((acc, item) => {
        if (item.id === this.user.id) {
          acc[item.id] = {
            username: this.user.username,
            status: this.user.storedStatus,
            avatar: this.user.avatar,
            moderator: this.user.moderator,
            administrator: this.user.administrator,
            id: this.user.id,
            createdAt: this.user.createdAt
          };
          return acc;
        }
        acc[item.id] = item;
        return acc;
      }, {});
    }
  },
  actions: {
    async blockUser() {
      await this.$apollo.mutate({
        mutation: BlockUserMutation,
        variables: {
          input: {
            userId: this.dialogs.block.userId,
            silent: this.dialogs.block.silent
          }
        }
      });
      this.dialogs.block.value = false;
      this.dialogs.block.userId = undefined;
      this.dialogs.block.silent = false;
    },
    getStatus(user: Partial<User>) {
      if (user.id === this.user?.id) return this.user?.storedStatus;
      const tracked = this.tracked.find((tracked) => tracked.id === user.id);
      if (tracked) return tracked.status;
      return useFriendsStore().friends.find((f) => f.friendId === user.id)?.user
        ?.status;
    },
    async getUser(username?: string, id?: number) {
      const {
        data: { user }
      } = await this.$apollo.query({
        query: ProfileQuery,
        fetchPolicy: "network-only",
        variables: {
          input: {
            username,
            id
          }
        }
      });
      return user;
    },
    applyTheme() {
      try {
        const app = useAppStore();
        if (
          this.user?.plan?.internalName !== "GOLD" &&
          app.site.officialInstance
        )
          return;
        const themeData = {
          ...(this.user?.themeEngine?.deviceSync
            ? this?.user?.themeEngine
            : JSON.parse(localStorage.getItem("themeEngine") || "{}"))
        };
        if (themeData.version === 1) {
          this.applyCSS();
          document.body.style.setProperty(
            "--gradient-offset",
            `${themeData.gradientOffset}%`
          );
          for (const theme of Object.entries(themeData.theme)) {
            //@ts-ignore
            theme[1].colors = {
              background: "#121212",
              surface: "#212121",
              "surface-bright": "#ccbfd6",
              "surface-variant": "#a3a3a3",
              "on-surface-variant": "#424242",
              primary: "#0190ea",
              "primary-darken-1": "#3700B3",
              secondary: "#757575",
              "secondary-darken-1": "#03DAC5",
              error: "#F44336",
              info: "#2196F3",
              success: "#4CAF50",
              warning: "#ff9800",
              logo1: "#096fea",
              logo2: "#0166ea",
              accent: "#000000",
              card: "#161616",
              toolbar: "#191919",
              sheet: "#151515",
              text: "#000000",
              dark: "#151515",
              background2: "#121212",
              gold: "#ffd700",
              //@ts-ignore
              ...theme[1].colors
            };
          }
          vuetify.theme.themes.value.dark.colors =
            themeData.theme.dark.colors ??
            vuetify.theme.themes.value.dark.colors;
          vuetify.theme.themes.value.light.colors =
            themeData.theme.light.colors ??
            vuetify.theme.themes.value.light.colors;
          vuetify.theme.themes.value.amoled.colors =
            themeData.theme.amoled.colors ??
            vuetify.theme.themes.value.amoled.colors;
          console.log(vuetify.theme.themes.value.dark.colors);

          app.fluidGradient = themeData.fluidGradient;
          if (themeData.fluidGradient) {
            document.body.classList.add("fluid-gradient");
          } else {
            document.body.classList.remove("fluid-gradient");
          }
        } else {
          throw new Error("Invalid theme version");
        }
      } catch (e) {
        console.log(e);
        document.body.style.setProperty("--gradient-offset", "100%");
      }
    },
    primaryColorResult(primaryColor?: string | null, gold?: boolean) {
      if (primaryColor && gold)
        return {
          gradient1: primaryColor,
          gradient2: primaryColor,
          primary: primaryColor
        };
      return gold || this.gold
        ? {
            gradient1: "#ffdb1b",
            gradient2: "#ffd700",
            primary: "#ffd700"
          }
        : {
            gradient1: "#096fea",
            gradient2: "#0166ea",
            primary: "#0190ea"
          };
    },
    async resendVerificationEmail() {
      try {
        const toast = useToast();
        this.actions.emailSent.loading = true;
        await axios.post("/user/verification/send");
        this.actions.emailSent.value = true;
        this.actions.emailSent.loading = false;
        toast.success("Verification email sent!");
      } catch {
        this.actions.emailSent.loading = false;
      }
    },
    async logout() {
      localStorage.removeItem("token");
      localStorage.removeItem("userStore");
      localStorage.removeItem("friendsStore");
      localStorage.removeItem("themeEngine");
      this.user = null;
      useAppStore().reconnectSocket("");
      this._postInitRan = false;
    },
    async changeStatus(status: UserStoredStatus) {
      if (!this.user) return;
      this.user.storedStatus = status;
      await this.save();
    },
    setChanges(user: User) {
      if (!user) return;
      this.changes = {
        email: user.email,
        discordPrecache: user.discordPrecache,
        username: user.username,
        itemsPerPage: user.itemsPerPage,
        storedStatus: user.storedStatus,
        description: user.description,
        insights: user.insights,
        profileLayout: user.profileLayout,
        excludedCollections: user.excludedCollections,
        language: user.language,
        publicProfile: user.publicProfile,
        weatherUnit: user.weatherUnit,
        privacyPolicyAccepted: user.privacyPolicyAccepted,
        nameColor: user.nameColor
      };
    },
    async init() {
      console.log(1);
      const user = localStorage.getItem("userStore");
      if (user) {
        try {
          this.user = JSON.parse(user);
          if (this.user) {
            this.setChanges(this.user);
            this.runPostTasks();
          }
        } catch {
          //
        }
      }
      console.log(2);
      const {
        data: { currentUser }
      } = await this.$apollo.query({
        query: GetUserQuery
      });
      this.user = currentUser;
      this.setChanges(<User>this.user);
      if (this.user?.themeEngine?.defaults?.prev) {
        delete this.user.themeEngine.defaults?.prev;
      }
      this.applyTheme();
      localStorage.setItem("userStore", JSON.stringify(currentUser));
      this.runPostTasks();
    },
    applyCSS(emergency: boolean = false) {
      //if (this.user?.plan.internalName !== "GOLD") return;
      if (
        this.changes.themeEngine?.customCSS !== undefined &&
        this.changes.themeEngine?.customCSS !== null
      ) {
        let style = document.getElementById("user-css");
        if (style?.innerHTML === "") {
          emergency = false;
        }
        if (style) {
          style.remove();
        }
        style = document.createElement("style");
        style.id = "user-css";
        style.innerHTML = emergency ? "" : this.changes.themeEngine.customCSS;
        document.head.appendChild(style);
      }
    },
    async save() {
      if (!this.user) return;
      this.applyCSS();
      // prev is undocumented and contains previous Vuetify values causing a memory leak
      if (
        !this.user.themeEngine?.theme?.dark?.colors &&
        this.user.themeEngine?.theme?.dark
      ) {
        this.user.themeEngine.theme.dark.colors =
          this.defaultVuetify.dark.colors;
      }
      if (
        !this.user.themeEngine?.theme?.light?.colors &&
        this.user.themeEngine?.theme?.light
      ) {
        this.user.themeEngine.theme.light.colors =
          this.defaultVuetify.light.colors;
      }
      if (
        !this.user.themeEngine?.theme?.amoled?.colors &&
        this.user.themeEngine?.theme?.amoled
      ) {
        this.user.themeEngine.theme.amoled.colors =
          this.defaultVuetify.amoled.colors;
      }
      await this.$apollo.mutate({
        mutation: UpdateUserMutation,
        variables: {
          input: {
            darkTheme: this.user.darkTheme,
            description: this.user.description,
            discordPrecache: this.user.discordPrecache,
            excludedCollections: this.user.excludedCollections,
            insights: this.user.insights,
            itemsPerPage: this.user.itemsPerPage,
            language: this.user.language,
            nameColor: this.user.nameColor,
            privacyPolicyAccepted: this.user.privacyPolicyAccepted,
            profileLayout: this.user.profileLayout,
            publicProfile: this.user.publicProfile,
            storedStatus: this.user.storedStatus,
            username: this.user.username,
            weatherUnit: this.user.weatherUnit,
            themeEngine: this.user.themeEngine
          }
        } as UpdateUserInput
      });
      this.user = {
        ...this.user,
        ...(this.changes as any)
      };
      i18n.global.locale = this.user?.language || "en";
    },
    async savePasswordRequired() {
      // TODO: new GraphQL mutation
    }
  }
});

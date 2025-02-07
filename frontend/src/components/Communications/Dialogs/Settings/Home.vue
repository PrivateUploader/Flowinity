<template>
  <UploadCropper
    v-model="upload"
    type="chatIcon"
    :supports-removal="false"
    @finish="uploadIcon"
  />
  <overline position="center">
    {{ $t("chats.settings.home.name") }}
  </overline>
  <div
    class="text-center flex-grow-1 justify-center"
    :class="{ 'd-flex': !$vuetify.display.mobile }"
  >
    <div style="max-width: 400px">
      <v-card-title
        style="
          padding: 0 10px 0 10px !important;
          margin: 0 !important;
          white-space: initial;
        "
      >
        {{ $t("chats.settings.home.avatar") }}
      </v-card-title>
      <v-card-subtitle style="white-space: initial" class="mb-4">
        {{ $t("chats.settings.home.avatarDesc") }}
      </v-card-subtitle>
      <UserAvatar
        :chat="$chat.editingChat"
        :edit="$chat.hasPermission('OVERVIEW', $chat.editingChat)"
        size="128"
        @click="
          upload = true;
          intent = 'icon';
        "
      />
      <v-card-subtitle class="mt-2">
        {{ $t("chats.settings.home.clickToChange") }}
      </v-card-subtitle>
      <v-btn
        v-if="$chat.editingChat.icon"
        variant="outlined"
        class="mt-2"
        :disabled="!$chat.hasPermission('OVERVIEW', $chat.editingChat)"
        @click="$chat.saveSettings({ icon: null })"
      >
        Remove Avatar
      </v-btn>
      <v-divider class="my-4" />
      <v-card-title
        style="
          padding: 0 10px 0 10px !important;
          margin: 0 !important;
          white-space: initial;
        "
      >
        {{ $t("chats.settings.home.background") }}
      </v-card-title>
      <v-card-subtitle style="white-space: initial" class="mb-4">
        {{ $t("chats.settings.home.backgroundDesc") }}
      </v-card-subtitle>
      <v-hover v-slot="{ isHovering, props }">
        <div
          class="invite mt-4 rounded-xl"
          style="height: unset; border: 1px solid #191919; aspect-ratio: 16 / 9"
          v-bind="props"
          :style="{
            background: $chat.editingChat.background
              ? `url(${$app.domain + $chat.editingChat.background})`
              : undefined,
            'background-repeat': $chat.editingChat?.background
              ? 'no-repeat'
              : undefined,
            'background-size': $chat.editingChat?.background
              ? 'cover'
              : undefined
          }"
        >
          <v-overlay
            :model-value="isHovering"
            :contained="true"
            :persistent="true"
            class="align-center justify-center pointer"
            @click="
              upload = true;
              intent = 'background';
            "
          >
            <v-icon size="48">mdi-upload</v-icon>
          </v-overlay>
          <v-card
            class="rounded-xl force-radius no-border"
            color="toolbar"
            width="120"
            height="62"
          >
            <v-skeleton-loader
              type="text, text"
              color="toolbar"
              class="no-border"
              :boilerplate="true"
            />
          </v-card>
        </div>
      </v-hover>
      <v-btn
        v-if="$chat.editingChat.background"
        variant="outlined"
        class="mt-2"
        :disabled="!$chat.hasPermission('OVERVIEW', $chat.editingChat)"
        @click="$chat.saveSettings({ background: null })"
      >
        Remove Background
      </v-btn>
    </div>
    <v-divider vertical class="ml-2 mr-6" />
    <div style="width: 400px">
      <v-card-title
        style="
          padding: 0 10px 0 10px !important;
          margin: 0 !important;
          white-space: initial;
        "
      >
        {{ $t("chats.settings.home.groupName") }}
      </v-card-title>
      <v-card-subtitle style="white-space: initial" class="mb-4">
        {{ $t("chats.settings.home.groupNameDesc") }}
      </v-card-subtitle>
      <v-text-field
        v-model="$chat.editingChat.name"
        :disabled="!$chat.hasPermission('OVERVIEW', $chat.editingChat)"
        :label="$t('chats.settings.home.groupName')"
      />
      <div style="width: 400px">
        <v-card-title
          style="
            padding: 0 10px 0 10px !important;
            margin: 0 !important;
            white-space: initial;
          "
        >
          {{ $t("chats.settings.home.description") }}
        </v-card-title>
        <v-card-subtitle style="white-space: initial" class="mb-4">
          {{ $t("chats.settings.home.descriptionDesc") }}
        </v-card-subtitle>
        <v-textarea
          v-model="$chat.editingChat.description"
          :disabled="!$chat.hasPermission('OVERVIEW', $chat.editingChat)"
          :label="$t('chats.settings.home.description')"
          variant="underlined"
          color="blue"
          maxlength="200"
        />
        <v-btn
          block
          :disabled="!$chat.hasPermission('OVERVIEW', $chat.editingChat)"
          :loading="$chat.dialogs.groupSettings.loading"
          @click="$chat.saveSettings()"
        >
          Save
        </v-btn>
      </div>
    </div>
  </div>
  <!-- TODO: v5 milestone -->
  <!--  <overline position="center" class="mt-4">-->
  <!--    {{ $t("chats.settings.home.insights.name") }}-->
  <!--  </overline>-->
  <!--  <div class="d-flex text-center flex-grow-1 justify-center"></div>-->
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Overline from "@/components/Core/Typography/Overline.vue";
import UserAvatar from "@/components/Users/UserAvatar.vue";
import UploadCropper from "@/components/Core/Dialogs/UploadCropper.vue";

export default defineComponent({
  name: "ChatSettingsHome",
  components: { UploadCropper, UserAvatar, Overline },
  data() {
    return {
      upload: false,
      intent: "icon" as "icon" | "background",
      uploadLoading: false
    };
  },
  methods: {
    async uploadIcon(file: File) {
      const formData = new FormData();
      formData.append("icon", file);
      await this.axios.post(
        `/chats/${this.$chat.editingChat?.association?.id}/icon?type=${this.intent}`,
        formData
      );
      this.upload = false;
    }
  }
});
</script>

<template>
  <span class="flex">
    <UserAvatar
      v-if="user"
      :id="'message-read-receipt-' + message.id + '-' + user.userId"
      :key="user.userId + '-' + message.id"
      :user="user"
      class="pointer read-receipt-avatar"
      size="22"
      style="align-self: flex-end; z-index: 1"
      @click.prevent="
        $chat.dialogs.user.username = user.username;
        $chat.dialogs.user.value = true;
      "
    >
      <v-tooltip
        v-if="!expanded"
        activator="parent"
        location="top"
        :eager="false"
        offset="18"
      >
        {{ user?.username }}
      </v-tooltip>
    </UserAvatar>
    <span v-if="expanded" class="ml-2">
      {{ user?.username }}
    </span>
  </span>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import UserAvatar from "@/components/Users/UserAvatar.vue";
import { User } from "@/models/user";
import { Message } from "@/models/message";

interface ReadReceipt {
  id: number;
  userId: number;
  user: User;
}

export default defineComponent({
  components: { UserAvatar },
  props: {
    readReceipt: {
      type: Object as () => ReadReceipt,
      required: true
    },
    message: {
      type: Object as () => Message,
      required: true
    },
    expanded: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    user() {
      return this.$user.users[
        this.readReceipt.user.id || this.readReceipt.userId
      ];
    }
  }
});
</script>

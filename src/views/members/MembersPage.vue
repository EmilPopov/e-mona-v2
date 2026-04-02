<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/more" />
        </ion-buttons>
        <ion-title>Members</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Members list -->
      <ion-list>
        <ion-item v-for="[uid, member] in memberEntries" :key="uid">
          <AvatarBadge
            :name="member.displayName"
            :color="memberAvatarColor(uid)"
            slot="start"
          />
          <ion-label>
            <h2>{{ member.displayName }}</h2>
            <p>{{ member.email }}</p>
            <p class="joined-date">Joined {{ formatJoinDate(member.joinedAt) }}</p>
          </ion-label>
          <ion-badge slot="end" :color="member.role === 'admin' ? 'primary' : 'medium'">
            {{ member.role }}
          </ion-badge>
          <ion-button
            v-if="isAdmin && member.role !== 'admin' && uid !== currentUserId"
            slot="end"
            fill="clear"
            color="danger"
            size="small"
            @click="confirmRemove(uid, member.displayName)"
          >
            <ion-icon :icon="removeCircleOutline" />
          </ion-button>
        </ion-item>
      </ion-list>

      <!-- Active Invitations (admin only) -->
      <template v-if="isAdmin">
        <ion-list-header class="ion-margin-top">
          <ion-label>Active Invitations</ion-label>
        </ion-list-header>

        <div v-if="loadingInvites" class="ion-text-center ion-padding">
          <ion-spinner name="crescent" />
        </div>

        <ion-list v-else-if="activeInvitations.length > 0">
          <ion-item v-for="inv in activeInvitations" :key="inv.id">
            <ion-icon :icon="mailOutline" slot="start" color="primary" />
            <ion-label>
              <h3>Code: {{ inv.code }}</h3>
              <p>Created {{ timeAgo(inv.createdAt) }} &middot; Expires {{ timeAgo(inv.expiresAt) }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <div v-else class="empty-invites ion-text-center">
          <p>No active invitations</p>
        </div>

        <ion-button
          expand="block"
          class="ion-margin-top"
          @click="showInviteModal = true"
        >
          <ion-icon :icon="personAddOutline" slot="start" />
          Invite New Member
        </ion-button>
      </template>

      <!-- Invite Modal -->
      <InviteModal
        :is-open="showInviteModal"
        :budget-id="budget?.id ?? ''"
        :budget-name="budget?.name ?? ''"
        :admin-user-id="currentUserId"
        :admin-name="currentUserName"
        @close="onInviteModalClose"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon,
  IonList, IonListHeader, IonItem, IonLabel, IonBadge, IonSpinner,
  alertController,
} from '@ionic/vue';
import { personAddOutline, removeCircleOutline, mailOutline } from 'ionicons/icons';
import { useBudgetStore } from '@/stores/budget.store';
import { useAuthStore } from '@/stores/auth.store';
import * as invitationService from '@/services/invitation.service';
import { isOk } from '@/types/result';
import type { Invitation, BudgetMember } from '@/types/types';
import AvatarBadge from '@/components/common/AvatarBadge.vue';
import InviteModal from '@/components/members/InviteModal.vue';

const budgetStore = useBudgetStore();
const authStore = useAuthStore();

const showInviteModal = ref(false);
const activeInvitations = ref<Invitation[]>([]);
const loadingInvites = ref(false);

const budget = computed(() => budgetStore.budget);
const currentUserId = computed(() => authStore.firebaseUser?.uid ?? '');
const currentUserName = computed(() => authStore.user?.displayName ?? '');

const isAdmin = computed(() => {
  if (!budget.value) return false;
  const member = budget.value.members[currentUserId.value];
  return member?.role === 'admin';
});

const memberEntries = computed(() => {
  if (!budget.value) return [];
  return Object.entries(budget.value.members) as [string, BudgetMember][];
});

// Use avatar colors from user profiles if available, fallback to hash-based
function memberAvatarColor(uid: string): string {
  // If it's the current user, use their avatarColor
  if (uid === currentUserId.value && authStore.user?.avatarColor) {
    return authStore.user.avatarColor;
  }
  // For other users, generate a deterministic color from uid
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9',
  ];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatJoinDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function timeAgo(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 0) {
    // Future date (expiry)
    const absMin = Math.abs(diffMin);
    if (absMin < 60) return `in ${absMin}m`;
    return `in ${Math.round(absMin / 60)}h`;
  }
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.round(diffMin / 60)}h ago`;
  return `${Math.round(diffMin / 1440)}d ago`;
}

async function loadInvitations() {
  if (!budget.value) return;
  loadingInvites.value = true;
  const result = await invitationService.getActiveInvitations(budget.value.id);
  if (isOk(result)) {
    activeInvitations.value = result.data;
  }
  loadingInvites.value = false;
}

async function confirmRemove(uid: string, name: string) {
  const alert = await alertController.create({
    header: 'Remove Member',
    message: `Remove ${name} from this budget? They will lose access to all shared data.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Remove',
        role: 'destructive',
        handler: async () => {
          if (!budget.value) return;
          await invitationService.removeMember(budget.value.id, uid);
        },
      },
    ],
  });
  await alert.present();
}

function onInviteModalClose() {
  showInviteModal.value = false;
  loadInvitations();
}

onMounted(() => {
  if (isAdmin.value) {
    loadInvitations();
  }
});
</script>

<style scoped>
.joined-date {
  font-size: 0.8em;
  color: var(--ion-color-medium);
}

.empty-invites {
  padding: 16px;
  color: var(--ion-color-medium);
}
</style>

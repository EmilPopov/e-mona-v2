<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/login" />
        </ion-buttons>
        <ion-title>Reset Password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="auth-container">
        <p class="instructions">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <div class="auth-form">
          <ion-item>
            <ion-input
              v-model="resetForm.email"
              type="email"
              label="Email"
              label-placement="floating"
              autocomplete="email"
              @keyup.enter="handleResetPassword"
            />
          </ion-item>

          <p v-if="resetError" class="error-text">{{ resetError }}</p>

          <ion-button
            expand="block"
            shape="round"
            :disabled="isLoading"
            @click="handleResetPassword"
          >
            <ion-spinner v-if="isLoading" name="crescent" />
            <span v-else>Send Reset Link</span>
          </ion-button>

          <div class="auth-links">
            <router-link to="/login">Back to login</router-link>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonContent, IonItem, IonInput,
  IonButton, IonSpinner,
} from '@ionic/vue';
import { useAuth } from '@/composables/useAuth';

const { resetForm, resetError, isLoading, handleResetPassword } = useAuth();
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 0 auto;
}

.instructions {
  color: var(--ion-color-medium);
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-text {
  color: var(--ion-color-danger);
  font-size: 0.875rem;
  margin: 0;
  text-align: center;
}

.auth-links {
  text-align: center;
  margin-top: 1rem;
}

.auth-links a {
  color: var(--ion-color-primary);
  text-decoration: none;
  font-weight: 500;
}
</style>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/login" />
        </ion-buttons>
        <ion-title>Create Account</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="auth-container">
        <div class="auth-form">
          <ion-item>
            <ion-input
              v-model="registerForm.displayName"
              type="text"
              label="Display Name"
              label-placement="floating"
              autocomplete="name"
            />
          </ion-item>

          <ion-item>
            <ion-input
              v-model="registerForm.email"
              type="email"
              label="Email"
              label-placement="floating"
              autocomplete="email"
            />
          </ion-item>

          <ion-item>
            <ion-input
              v-model="registerForm.password"
              type="password"
              label="Password"
              label-placement="floating"
              autocomplete="new-password"
            />
          </ion-item>

          <ion-item>
            <ion-input
              v-model="registerForm.confirmPassword"
              type="password"
              label="Confirm Password"
              label-placement="floating"
              autocomplete="new-password"
              @keyup.enter="handleRegister"
            />
          </ion-item>

          <p v-if="registerError" class="error-text">{{ registerError }}</p>

          <ion-button
            expand="block"
            shape="round"
            :disabled="isLoading"
            @click="handleRegister"
          >
            <ion-spinner v-if="isLoading" name="crescent" />
            <span v-else>Create Account</span>
          </ion-button>

          <div class="auth-links">
            <p>
              Already have an account?
              <router-link to="/login">Log in</router-link>
            </p>
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

const { registerForm, registerError, isLoading, handleRegister } = useAuth();
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 0 auto;
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

.auth-links p {
  color: var(--ion-color-medium);
}
</style>

<template>
  <ion-page>
    <ion-content class="ion-padding" :fullscreen="true">
      <div class="auth-container">
        <div class="auth-header">
          <h1 class="app-title">e-mona</h1>
          <p class="app-subtitle">Smart family budget</p>
        </div>

        <div class="auth-form">
          <ion-item>
            <ion-input
              v-model="loginForm.email"
              type="email"
              label="Email"
              label-placement="floating"
              autocomplete="email"
              @keyup.enter="handleLogin"
            />
          </ion-item>

          <ion-item>
            <ion-input
              v-model="loginForm.password"
              type="password"
              label="Password"
              label-placement="floating"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
          </ion-item>

          <p v-if="loginError" class="error-text">{{ loginError }}</p>

          <ion-button
            expand="block"
            shape="round"
            :disabled="isLoading"
            @click="handleLogin"
          >
            <ion-spinner v-if="isLoading" name="crescent" />
            <span v-else>Log in</span>
          </ion-button>

          <div class="auth-links">
            <router-link to="/forgot-password">Forgot password?</router-link>
            <p>
              Don't have an account?
              <router-link to="/register">Create one</router-link>
            </p>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonItem, IonInput,
  IonButton, IonSpinner,
} from '@ionic/vue';
import { useAuth } from '@/composables/useAuth';

const { loginForm, loginError, isLoading, handleLogin } = useAuth();
</script>

<style scoped>
.auth-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.app-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--ion-color-primary);
  margin: 0;
}

.app-subtitle {
  font-size: 1rem;
  color: var(--ion-color-medium);
  margin: 0.25rem 0 0;
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
  margin-top: 0.5rem;
  color: var(--ion-color-medium);
}
</style>

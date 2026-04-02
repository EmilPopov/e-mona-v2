import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/useToast';
import { isOk } from '@/types/result';

export function useAuth() {
  const authStore = useAuthStore();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const loginForm = reactive({
    email: '',
    password: '',
  });

  const registerForm = reactive({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });

  const resetForm = reactive({
    email: '',
  });

  const loginError = ref<string | null>(null);
  const registerError = ref<string | null>(null);
  const resetError = ref<string | null>(null);
  const isLoading = ref(false);

  function validateLogin(): boolean {
    if (!loginForm.email.trim()) {
      loginError.value = 'Email is required.';
      return false;
    }
    if (!loginForm.password) {
      loginError.value = 'Password is required.';
      return false;
    }
    loginError.value = null;
    return true;
  }

  function validateRegister(): boolean {
    if (!registerForm.displayName.trim() || registerForm.displayName.trim().length < 2) {
      registerError.value = 'Name must be at least 2 characters.';
      return false;
    }
    if (!registerForm.email.trim()) {
      registerError.value = 'Email is required.';
      return false;
    }
    if (registerForm.password.length < 6) {
      registerError.value = 'Password must be at least 6 characters.';
      return false;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      registerError.value = 'Passwords do not match.';
      return false;
    }
    registerError.value = null;
    return true;
  }

  async function handleLogin(): Promise<void> {
    if (!validateLogin()) return;

    isLoading.value = true;
    loginError.value = null;

    const result = await authStore.login(loginForm.email.trim(), loginForm.password);

    isLoading.value = false;

    if (isOk(result)) {
      const user = await authStore.waitForProfile();
      if (user?.activeBudgetId) {
        await router.replace('/tabs/home');
      } else {
        await router.replace('/budget/welcome');
      }
    } else {
      loginError.value = result.error.message;
    }
  }

  async function handleRegister(): Promise<void> {
    if (!validateRegister()) return;

    isLoading.value = true;
    registerError.value = null;

    const result = await authStore.register(
      registerForm.email.trim(),
      registerForm.password,
      registerForm.displayName.trim(),
    );

    isLoading.value = false;

    if (isOk(result)) {
      await showSuccess('Account created!');
      await router.replace('/budget/welcome');
    } else {
      registerError.value = result.error.message;
    }
  }

  async function handleResetPassword(): Promise<void> {
    if (!resetForm.email.trim()) {
      resetError.value = 'Email is required.';
      return;
    }

    isLoading.value = true;
    resetError.value = null;

    const { resetPassword } = await import('@/services/auth.service');
    const result = await resetPassword(resetForm.email.trim());

    isLoading.value = false;

    if (isOk(result)) {
      await showSuccess('Password reset email sent. Check your inbox.');
    } else {
      resetError.value = result.error.message;
    }
  }

  return {
    loginForm,
    registerForm,
    resetForm,
    loginError,
    registerError,
    resetError,
    isLoading,
    handleLogin,
    handleRegister,
    handleResetPassword,
  };
}

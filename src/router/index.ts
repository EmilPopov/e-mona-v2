import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useBudgetStore } from '@/stores/budget.store';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login',
  },
  // Guest-only routes
  {
    path: '/login',
    component: () => import('@/views/auth/LoginPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    component: () => import('@/views/auth/RegisterPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/forgot-password',
    component: () => import('@/views/auth/ForgotPasswordPage.vue'),
    meta: { guestOnly: true },
  },
  // Budget welcome (create or join)
  {
    path: '/budget/welcome',
    component: () => import('@/views/budget/BudgetWelcome.vue'),
    meta: { requiresAuth: true },
  },
  // Budget setup wizard
  {
    path: '/budget/setup',
    component: () => import('@/views/budget/BudgetSetup.vue'),
    meta: { requiresAuth: true },
  },
  // New month review
  {
    path: '/budget/month-review',
    component: () => import('@/views/budget/NewMonthReview.vue'),
    meta: { requiresAuth: true, requiresBudget: true },
  },
  // Tab routes
  {
    path: '/tabs/',
    component: () => import('@/views/TabsPage.vue'),
    meta: { requiresAuth: true, requiresBudget: true },
    children: [
      {
        path: '',
        redirect: '/tabs/home',
      },
      {
        path: 'home',
        component: () => import('@/views/budget/BudgetDashboard.vue'),
      },
      {
        path: 'purchases',
        component: () => import('@/views/purchases/PurchasesListPage.vue'),
      },
      {
        path: 'new-purchase',
        component: () => import('@/views/purchases/NewPurchasePage.vue'),
      },
      {
        path: 'purchases/:purchaseId',
        component: () => import('@/views/purchases/PurchaseDetailPage.vue'),
      },
      {
        path: 'more',
        component: () => import('@/views/settings/MorePage.vue'),
      },
      {
        path: 'more/profile',
        component: () => import('@/views/settings/ProfileSettings.vue'),
      },
      {
        path: 'more/fixed-costs',
        component: () => import('@/views/budget/FixedCostsPage.vue'),
      },
      {
        path: 'more/yearly-goals',
        component: () => import('@/views/budget/YearlyGoalsPage.vue'),
      },
      {
        path: 'more/categories',
        component: () => import('@/views/budget/CategoriesPage.vue'),
      },
      {
        path: 'more/members',
        component: () => import('@/views/members/MembersPage.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  // Wait for Firebase to check existing session
  if (!authStore.initialized) {
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (authStore.initialized) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  const isAuth = authStore.isAuthenticated;

  // Guest-only pages: redirect authenticated users
  if (to.meta.guestOnly && isAuth) {
    const user = authStore.user;
    if (user?.activeBudgetId) {
      return '/tabs/home';
    }
    return '/budget/welcome';
  }

  // Auth-required pages: redirect to login
  if (to.meta.requiresAuth && !isAuth) {
    return '/login';
  }

  // Budget-required pages: ensure budget is loaded
  if (to.meta.requiresBudget && isAuth) {
    const user = authStore.user;
    if (!user?.activeBudgetId) {
      return '/budget/welcome';
    }

    const budgetStore = useBudgetStore();

    // Load budget if not already loaded or if it's a different budget
    if (!budgetStore.budget || budgetStore.budget.id !== user.activeBudgetId) {
      const success = await budgetStore.loadBudget(user.activeBudgetId);
      if (!success) {
        // Budget failed to load (deleted?) — send to setup
        return '/budget/welcome';
      }
    }

    // Check if current month is a draft that needs review
    if (
      budgetStore.currentMonth?.status === 'draft' &&
      to.path !== '/budget/month-review'
    ) {
      return '/budget/month-review';
    }
  }
});

export default router;

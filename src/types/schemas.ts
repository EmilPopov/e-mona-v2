import { z } from 'zod';
import { CurrencyCode, UserRole, MonthStatus, GoalFrequency } from './enums';

// --- Shared sub-schemas ---

const NotificationPrefs = z.object({
  dailyReminder: z.boolean(),
  budgetAlerts: z.boolean(),
  reminderTime: z.string(),
});

// --- User ---

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().min(2),
  avatarColor: z.string(),
  createdAt: z.date(),
  activeBudgetId: z.string().nullable(),
  currency: CurrencyCode,
  fcmTokens: z.array(z.string()),
  notificationPrefs: NotificationPrefs,
}).strict();

export const UserCreateSchema = UserSchema.omit({ id: true });
export const UserUpdateSchema = UserSchema.omit({ id: true, createdAt: true }).partial();

// --- Budget ---

const BudgetMember = z.object({
  userId: z.string(),
  role: UserRole,
  joinedAt: z.date(),
  displayName: z.string(),
  avatarColor: z.string(),
});

export const BudgetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  currency: CurrencyCode,
  income: z.number().int().min(0),
  ownerId: z.string(),
  members: z.array(BudgetMember),
  createdAt: z.date(),
  updatedAt: z.date(),
}).strict();

export const BudgetCreateSchema = BudgetSchema.omit({ id: true });
export const BudgetUpdateSchema = BudgetSchema.omit({ id: true, createdAt: true, ownerId: true }).partial();

// --- Category ---

export const CategorySchema = z.object({
  id: z.string(),
  budgetId: z.string(),
  name: z.string().min(1),
  icon: z.string(),
  color: z.string(),
  sortOrder: z.number().int(),
}).strict();

export const CategoryCreateSchema = CategorySchema.omit({ id: true });
export const CategoryUpdateSchema = CategorySchema.omit({ id: true, budgetId: true }).partial();

// --- Fixed Cost ---

export const FixedCostSchema = z.object({
  id: z.string(),
  budgetId: z.string(),
  name: z.string().min(1),
  amount: z.number().int().min(0),
  isActive: z.boolean(),
  createdAt: z.date(),
}).strict();

export const FixedCostCreateSchema = FixedCostSchema.omit({ id: true });
export const FixedCostUpdateSchema = FixedCostSchema.omit({ id: true, budgetId: true, createdAt: true }).partial();

// --- Yearly Goal ---

export const YearlyGoalSchema = z.object({
  id: z.string(),
  budgetId: z.string(),
  name: z.string().min(1),
  targetAmount: z.number().int().min(0),
  frequency: GoalFrequency,
  isActive: z.boolean(),
  createdAt: z.date(),
}).strict();

export const YearlyGoalCreateSchema = YearlyGoalSchema.omit({ id: true });
export const YearlyGoalUpdateSchema = YearlyGoalSchema.omit({ id: true, budgetId: true, createdAt: true }).partial();

// --- Budget Month ---

export const BudgetMonthSchema = z.object({
  id: z.string(), // "YYYY-MM"
  budgetId: z.string(),
  income: z.number().int().min(0),
  totalFixedCosts: z.number().int().min(0),
  totalYearlyGoals: z.number().int().min(0),
  totalPurchases: z.number().int().min(0),
  spendingBudget: z.number().int(),
  remaining: z.number().int(),
  status: MonthStatus,
  createdAt: z.date(),
}).strict();

export const BudgetMonthCreateSchema = BudgetMonthSchema.omit({ id: true });
export const BudgetMonthUpdateSchema = BudgetMonthSchema.omit({ id: true, budgetId: true, createdAt: true }).partial();

// --- Item (product in a purchase) ---

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().int().min(0),
  quantity: z.number().int().min(1),
  categoryId: z.string().nullable(),
}).strict();

export const ItemCreateSchema = ItemSchema.omit({ id: true });

// --- Purchase (a shopping trip) ---

export const PurchaseSchema = z.object({
  id: z.string(),
  budgetId: z.string(),
  monthId: z.string(), // "YYYY-MM"
  storeName: z.string().min(1),
  totalAmount: z.number().int().min(0),
  items: z.array(ItemSchema),
  userId: z.string(),
  userDisplayName: z.string(),
  createdAt: z.date(),
}).strict();

export const PurchaseCreateSchema = PurchaseSchema.omit({ id: true });
export const PurchaseUpdateSchema = PurchaseSchema.omit({ id: true, budgetId: true, monthId: true, userId: true, createdAt: true }).partial();

// --- Invitation ---

export const InvitationSchema = z.object({
  id: z.string(),
  budgetId: z.string(),
  budgetName: z.string(),
  invitedBy: z.string(),
  invitedByName: z.string(),
  code: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
}).strict();

export const InvitationCreateSchema = InvitationSchema.omit({ id: true });

// --- Favorite ---

export const FavoriteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1),
  items: z.array(ItemCreateSchema),
  storeName: z.string(),
  createdAt: z.date(),
}).strict();

export const FavoriteCreateSchema = FavoriteSchema.omit({ id: true });

import { z } from 'zod';
import { CurrencyCode, UserRole, MonthStatus } from './enums';

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

const BudgetMemberSchema = z.object({
  role: UserRole,
  displayName: z.string(),
  email: z.string().email(),
  joinedAt: z.date(),
});

export const BudgetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  currency: CurrencyCode,
  createdBy: z.string(),
  createdAt: z.date(),
  memberIds: z.array(z.string()),
  members: z.record(z.string(), BudgetMemberSchema),
}).strict();

export const BudgetCreateSchema = BudgetSchema.omit({ id: true });
export const BudgetUpdateSchema = BudgetSchema.omit({ id: true, createdAt: true, createdBy: true }).partial();

// --- Category (subcollection: budgets/{budgetId}/categories/{categoryId}) ---

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string(),
  icon: z.string(),
  parentCategoryId: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
}).strict();

export const CategoryCreateSchema = CategorySchema.omit({ id: true });
export const CategoryUpdateSchema = CategorySchema.omit({ id: true }).partial();

// --- Fixed Cost (subcollection: budgets/{budgetId}/fixedCosts/{costId}) ---

export const FixedCostSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  amount: z.number().int().min(0),
  categoryId: z.string(),
  icon: z.string(),
  isActive: z.boolean(),
  createdBy: z.string(),
}).strict();

export const FixedCostCreateSchema = FixedCostSchema.omit({ id: true });
export const FixedCostUpdateSchema = FixedCostSchema.omit({ id: true, createdBy: true }).partial();

// --- Yearly Goal (subcollection: budgets/{budgetId}/yearlyGoals/{goalId}) ---

export const YearlyGoalSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  targetAmount: z.number().int().min(0),
  monthlyAmount: z.number().int().min(0),
  categoryId: z.string(),
  icon: z.string(),
  startMonth: z.string(), // "YYYY-MM"
  isActive: z.boolean(),
  createdBy: z.string(),
}).strict();

export const YearlyGoalCreateSchema = YearlyGoalSchema.omit({ id: true });
export const YearlyGoalUpdateSchema = YearlyGoalSchema.omit({ id: true, createdBy: true }).partial();

// --- Item Catalog (subcollection: budgets/{budgetId}/items/{itemId}) ---

export const CatalogItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  nameLowercase: z.string(),
  defaultPrice: z.number().int().min(0),
  categoryId: z.string(),
  icon: z.string(),
  isActive: z.boolean(),
  lastUsedAt: z.date().nullable(),
}).strict();

export const CatalogItemCreateSchema = CatalogItemSchema.omit({ id: true });
export const CatalogItemUpdateSchema = CatalogItemSchema.omit({ id: true }).partial();

// --- Budget Month (subcollection: budgets/{budgetId}/months/{YYYY-MM}) ---

const IncomeEntry = z.object({
  id: z.string(),
  name: z.string().min(1),
  amount: z.number().int().min(0),
  addedBy: z.string(),
});

const AppliedFixedCost = z.object({
  costId: z.string(),
  name: z.string(),
  amount: z.number().int().min(0),
});

const AppliedGoalDeduction = z.object({
  goalId: z.string(),
  name: z.string(),
  monthlyAmount: z.number().int().min(0),
  accumulatedTotal: z.number().int().min(0),
});

const MonthAlerts = z.object({
  eightyPercentSent: z.boolean(),
  overspentSent: z.boolean(),
});

export const BudgetMonthSchema = z.object({
  id: z.string(), // "YYYY-MM"
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  status: MonthStatus,
  incomes: z.array(IncomeEntry),
  totalIncome: z.number().int().min(0),
  totalFixedCosts: z.number().int().min(0),
  totalGoalDeductions: z.number().int().min(0),
  totalPurchases: z.number().int().min(0),
  spendingBudget: z.number().int(),
  rolloverAmount: z.number().int(),
  rolloverEnabled: z.boolean(),
  confirmedAt: z.date().nullable(),
  confirmedBy: z.string().nullable(),
  appliedFixedCosts: z.array(AppliedFixedCost),
  appliedGoalDeductions: z.array(AppliedGoalDeduction),
  alerts: MonthAlerts,
}).strict();

export const BudgetMonthCreateSchema = BudgetMonthSchema.omit({ id: true });
export const BudgetMonthUpdateSchema = BudgetMonthSchema.omit({ id: true }).partial();

// --- Purchase (subcollection: budgets/{budgetId}/months/{YYYY-MM}/purchases/{purchaseId}) ---

const PurchaseItem = z.object({
  id: z.string(),
  itemId: z.string().nullable(),       // null if ad-hoc (not from catalog)
  name: z.string().min(1),
  price: z.number().int().min(0),      // price per unit in cents
  quantity: z.number().int().min(1),
  categoryId: z.string(),              // required — every item must have a category
  categoryName: z.string(),            // denormalized for display
  categoryColor: z.string(),           // denormalized for display
});

export const PurchaseSchema = z.object({
  id: z.string(),
  date: z.date(),                         // When the purchase happened
  createdBy: z.string(),                  // userId
  createdByName: z.string(),              // Denormalized display name
  note: z.string().nullable(),            // "Lidl shopping", "Lunch with team"
  items: z.array(PurchaseItem),
  total: z.number().int().min(0),         // Pre-calculated sum (price × qty)
  createdAt: z.date(),                    // When logged in the app
}).strict();

export const PurchaseCreateSchema = PurchaseSchema.omit({ id: true });
export const PurchaseUpdateSchema = PurchaseSchema.omit({ id: true, createdBy: true, createdAt: true }).partial();

// --- Invitation ---

const InvitationStatus = z.enum(['active', 'used', 'expired']);

export const InvitationSchema = z.object({
  id: z.string(),
  code: z.string(),
  budgetId: z.string(),
  budgetName: z.string(),
  role: UserRole,
  createdBy: z.string(),
  createdByName: z.string(),
  status: InvitationStatus,
  usedBy: z.string().nullable(),
  createdAt: z.date(),
  expiresAt: z.date(),
}).strict();

export const InvitationCreateSchema = InvitationSchema.omit({ id: true });

// --- Favorite ---

export const FavoriteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1),
  items: z.array(PurchaseItem.omit({ id: true })),
  storeName: z.string(),
  createdAt: z.date(),
}).strict();

export const FavoriteCreateSchema = FavoriteSchema.omit({ id: true });

// Re-export sub-schemas for use in services
export { IncomeEntry, AppliedFixedCost, AppliedGoalDeduction, MonthAlerts, BudgetMemberSchema, PurchaseItem };

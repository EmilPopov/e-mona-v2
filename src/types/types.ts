import type { z } from 'zod';
import type {
  UserSchema,
  UserCreateSchema,
  UserUpdateSchema,
  BudgetSchema,
  BudgetCreateSchema,
  BudgetUpdateSchema,
  BudgetMemberSchema,
  CategorySchema,
  CategoryCreateSchema,
  CategoryUpdateSchema,
  FixedCostSchema,
  FixedCostCreateSchema,
  FixedCostUpdateSchema,
  YearlyGoalSchema,
  YearlyGoalCreateSchema,
  YearlyGoalUpdateSchema,
  CatalogItemSchema,
  CatalogItemCreateSchema,
  CatalogItemUpdateSchema,
  BudgetMonthSchema,
  BudgetMonthCreateSchema,
  BudgetMonthUpdateSchema,
  IncomeEntry,
  AppliedFixedCost,
  AppliedGoalDeduction,
  MonthAlerts,
  PurchaseItem,
  PurchaseSchema,
  PurchaseCreateSchema,
  PurchaseUpdateSchema,
  InvitationSchema,
  InvitationCreateSchema,
  FavoriteSchema,
  FavoriteCreateSchema,
} from './schemas';
import type { CurrencyCode, UserRole, MonthStatus } from './enums';

// Enums
export type CurrencyCode = z.infer<typeof CurrencyCode>;
export type UserRole = z.infer<typeof UserRole>;
export type MonthStatus = z.infer<typeof MonthStatus>;

// User
export type User = z.infer<typeof UserSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

// Budget
export type Budget = z.infer<typeof BudgetSchema>;
export type BudgetCreate = z.infer<typeof BudgetCreateSchema>;
export type BudgetUpdate = z.infer<typeof BudgetUpdateSchema>;
export type BudgetMember = z.infer<typeof BudgetMemberSchema>;

// Category
export type Category = z.infer<typeof CategorySchema>;
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;

// Fixed Cost
export type FixedCost = z.infer<typeof FixedCostSchema>;
export type FixedCostCreate = z.infer<typeof FixedCostCreateSchema>;
export type FixedCostUpdate = z.infer<typeof FixedCostUpdateSchema>;

// Yearly Goal
export type YearlyGoal = z.infer<typeof YearlyGoalSchema>;
export type YearlyGoalCreate = z.infer<typeof YearlyGoalCreateSchema>;
export type YearlyGoalUpdate = z.infer<typeof YearlyGoalUpdateSchema>;

// Catalog Item
export type CatalogItem = z.infer<typeof CatalogItemSchema>;
export type CatalogItemCreate = z.infer<typeof CatalogItemCreateSchema>;
export type CatalogItemUpdate = z.infer<typeof CatalogItemUpdateSchema>;

// Budget Month
export type BudgetMonth = z.infer<typeof BudgetMonthSchema>;
export type BudgetMonthCreate = z.infer<typeof BudgetMonthCreateSchema>;
export type BudgetMonthUpdate = z.infer<typeof BudgetMonthUpdateSchema>;
export type IncomeEntry = z.infer<typeof IncomeEntry>;
export type AppliedFixedCost = z.infer<typeof AppliedFixedCost>;
export type AppliedGoalDeduction = z.infer<typeof AppliedGoalDeduction>;
export type MonthAlerts = z.infer<typeof MonthAlerts>;

// Purchase
export type PurchaseItem = z.infer<typeof PurchaseItem>;
export type Purchase = z.infer<typeof PurchaseSchema>;
export type PurchaseCreate = z.infer<typeof PurchaseCreateSchema>;
export type PurchaseUpdate = z.infer<typeof PurchaseUpdateSchema>;

// Invitation
export type Invitation = z.infer<typeof InvitationSchema>;
export type InvitationCreate = z.infer<typeof InvitationCreateSchema>;

// Favorite
export type Favorite = z.infer<typeof FavoriteSchema>;
export type FavoriteCreate = z.infer<typeof FavoriteCreateSchema>;

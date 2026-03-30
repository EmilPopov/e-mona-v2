import { z } from 'zod';

export const CurrencyCode = z.enum(['EUR', 'USD', 'GBP']);
export const UserRole = z.enum(['admin', 'member']);
export const MonthStatus = z.enum(['draft', 'active', 'closed']);
export const GoalFrequency = z.enum(['yearly', 'monthly']);

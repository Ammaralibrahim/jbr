import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
});

export const dailyLogSchema = z.object({
  unitId: z.string().min(1, 'الوحدة مطلوبة'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  operatingHours: z.number().min(0).max(24, 'ساعات العمل يجب أن تكون بين 0 و 24'),
  pMax: z.number().min(0),
  pMin: z.number().min(0),
  qMax: z.number().min(0),
  qMin: z.number().min(0),
  generatorStart: z.number().min(0),
  generatorEnd: z.number().min(0),
  bt01Start: z.number().min(0).default(0),
  bt01End: z.number().min(0).default(0),
  bt02Start: z.number().min(0).default(0),
  bt02End: z.number().min(0).default(0),
  bl01Start: z.number().min(0).default(0),
  bl01End: z.number().min(0).default(0),
  bm01Start: z.number().min(0).default(0),
  bm01End: z.number().min(0).default(0),
  excitationStart: z.number().min(0).default(0),
  excitationEnd: z.number().min(0).default(0),
  reactiveStart: z.number().min(0).default(0),
  reactiveEnd: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const userSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  role: z.enum(['Admin', 'PlantManager', 'Operator']),
  employeeId: z.string().min(1, 'الرقم الوظيفي مطلوب'),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const unitSchema = z.object({
  unitCode: z.enum(['ST1', 'ST2', 'ST3', 'GT1', 'GT2', 'GT3', 'GT4']),
  unitName: z.string().min(1, 'اسم الوحدة مطلوب'),
  unitNameAr: z.string().min(1, 'الاسم بالعربية مطلوب'),
  unitType: z.enum(['Steam', 'Gas']),
  capacityMW: z.number().min(0),
  multiplier: z.number().min(0.001, 'المعامل يجب أن يكون أكبر من صفر'),
  sortOrder: z.number().default(0),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type DailyLogSchema = z.infer<typeof dailyLogSchema>;
export type UserSchema = z.infer<typeof userSchema>;
export type UnitSchema = z.infer<typeof unitSchema>;
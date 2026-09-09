import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMonthName(month: number): string {
  const monthNames = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  return monthNames[month - 1];
}

export function getUnitTypeAr(type: 'Steam' | 'Gas'): string {
  return type === 'Steam' ? 'بخارية' : 'غازية';
}

export function getRoleAr(role: string): string {
  const roles: Record<string, string> = {
    Admin: 'مدير النظام',
    PlantManager: 'مدير المحطة',
    Operator: 'مشغل',
  };
  return roles[role] || role;
}
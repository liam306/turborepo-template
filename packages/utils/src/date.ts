import type { SupportedLocale } from '@repo/types';
import {
  differenceInCalendarDays,
  format,
  isBefore,
  isValid,
  parse,
  parseISO,
} from 'date-fns';

/**
 * Get today date formatted as ISO string 'YYYY-MM-DD'
 */
export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Format ISO date 'YYYY-MM-DD' according to locale ('DD/MM/YYYY' for vi, 'MM/DD/YYYY' or 'yyyy-MM-dd' for en)
 */
export function formatDate(
  dateString: string,
  locale: SupportedLocale = 'vi',
  customPattern?: string,
): string {
  if (!dateString) return '';
  try {
    const parsed = parseISO(dateString);
    if (!isValid(parsed)) return dateString;
    if (customPattern) return format(parsed, customPattern);
    return format(parsed, locale === 'vi' ? 'dd/MM/yyyy' : 'MM/dd/yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Format ISO date 'YYYY-MM-DD' to Vietnamese format 'DD/MM/YYYY'
 */
export function formatDateVN(dateString: string): string {
  return formatDate(dateString, 'vi');
}

/**
 * Parse Vietnamese date string 'DD/MM/YYYY' to ISO 'YYYY-MM-DD'
 */
export function parseVNDateToISO(vnDateStr: string): string {
  if (!vnDateStr) return '';
  try {
    const parsed = parse(vnDateStr.trim(), 'dd/MM/yyyy', new Date());
    if (!isValid(parsed)) return vnDateStr;
    return format(parsed, 'yyyy-MM-dd');
  } catch {
    return vnDateStr;
  }
}

/**
 * Calculate difference in calendar days between two ISO dates (endDate - startDate)
 */
export function calculateDaysBetween(
  startDateISO: string,
  endDateISO: string,
): number {
  try {
    const start = parseISO(startDateISO);
    const end = parseISO(endDateISO);
    return Math.max(0, differenceInCalendarDays(end, start));
  } catch {
    return 0;
  }
}

/**
 * Check if a date is strictly in the past compared to today
 */
export function isDatePast(
  dateISO: string,
  referenceDateISO?: string,
): boolean {
  try {
    const date = parseISO(dateISO);
    const ref = referenceDateISO ? parseISO(referenceDateISO) : new Date();
    return isBefore(date, ref);
  } catch {
    return false;
  }
}

/**
 * Check if a date has arrived or passed (greater than or equal to reference)
 */
export function isDateMatured(
  maturityDateISO: string,
  referenceDateISO?: string,
): boolean {
  try {
    const maturity = parseISO(maturityDateISO);
    const ref = referenceDateISO ? parseISO(referenceDateISO) : new Date();
    return differenceInCalendarDays(ref, maturity) >= 0;
  } catch {
    return false;
  }
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if current time is within business hours
 */
export function isWithinBusinessHours(
  timezone: string,
  hoursStart: string,
  hoursEnd: string,
  daysOpen: number[]
): boolean {
  const now = toZonedTime(new Date(), timezone);
  const dayOfWeek = now.getDay();
  
  // Convert Sunday (0) to 7 for consistency with Monday=1 format
  const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  
  // Check if today is an open day
  if (!daysOpen.includes(adjustedDay)) {
    return false;
  }
  
  // Parse hours
  const [startHour, startMinute] = hoursStart.split(':').map(Number);
  const [endHour, endMinute] = hoursEnd.split(':').map(Number);
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;
  
  return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
}

/**
 * Formats business hours for display
 */
export function formatBusinessHours(hoursStart: string, hoursEnd: string): string {
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };
  
  return `${formatTime(hoursStart)} - ${formatTime(hoursEnd)}`;
}

/**
 * Formats days of week for display
 */
export function formatDaysOpen(daysOpen: number[]): string {
  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedDays = [...daysOpen].sort((a, b) => a - b);
  
  if (sortedDays.length === 0) return 'Closed';
  if (sortedDays.length === 7) return 'Every day';
  if (sortedDays.length === 5 && sortedDays.every(d => d >= 1 && d <= 5)) return 'Monday - Friday';
  
  return sortedDays.map(d => dayNames[d]).join(', ');
}

/**
 * Substitutes variables in message template
 */
export function substituteMessageVariables(
  template: string,
  variables: {
    businessName?: string;
    businessHours?: string;
    callerName?: string;
  }
): string {
  let message = template;
  
  if (variables.businessName) {
    message = message.replace(/\{business_name\}/g, variables.businessName);
  }
  
  if (variables.businessHours) {
    message = message.replace(/\{business_hours\}/g, variables.businessHours);
  }
  
  if (variables.callerName) {
    message = message.replace(/\{caller_name\}/g, variables.callerName);
  } else {
    message = message.replace(/\{caller_name\}/g, 'there');
  }
  
  return message;
}

/**
 * Gets current month in format "2026-01"
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formats a date for display
 */
export function formatDate(date: Date | string, formatStr: string = 'PPp'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Formats a date relative to now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return format(date, 'PP');
}

/**
 * Validates email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number (basic validation)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
}

/**
 * Truncates text to specified length
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Capitalizes first letter of each word
 */
export function capitalize(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

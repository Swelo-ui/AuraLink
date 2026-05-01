import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Get the API URL from environment variables, or default to empty string for relative paths
export const API_URL = import.meta.env.VITE_API_URL || '';


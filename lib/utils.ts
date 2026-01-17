/**
 * ============================================================
 * 📄 FILE: frontend/lib/utils.ts
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Utility functions for styling (shadcn/ui requirement).
 * 
 * 🛠️ TECH USED:
 *    - clsx (conditional classnames)
 *    - tailwind-merge (merge Tailwind classes)
 * 
 * ============================================================
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

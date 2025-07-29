import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get user initials from name
 * @param name User name
 * @returns Initials (maximum 2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.split(/[ -]/);
  
  if (parts.length === 1) {
    return name.substring(0, 2).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a deterministic color for user avatar based on input
 * @param input String to base color on (e.g., username or user ID)
 * @returns Color as hex string
 */
export function getRandomColor(input?: string): string {
  // Predefined color palette for better visibility against white text
  const colors = [
    '#D32F2F', // Red
    '#7B1FA2', // Purple
    '#1976D2', // Blue
    '#0097A7', // Cyan
    '#388E3C', // Green
    '#FBC02D', // Yellow
    '#F57C00', // Orange
    '#5D4037', // Brown
    '#455A64', // Blue Grey
    '#616161', // Grey
  ];
  
  // If no input provided, use current timestamp for deterministic but changing color
  const seed = input || new Date().toISOString();
  
  // Generate hash from input for deterministic selection
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Format bytes to human-readable string
 * @param bytes Number of bytes
 * @returns Formatted string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

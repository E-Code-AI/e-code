import { twMerge } from 'tailwind-merge';

type ClassValue = string | false | null | undefined;

export function cx(...classes: ClassValue[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}

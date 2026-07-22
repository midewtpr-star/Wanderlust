import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn — merge conditional class names, de-duping conflicting Tailwind utilities.
// The shadcn / React Native Reusables convention; used by every ui/ primitive.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare module "*";

declare global {
  interface RequestInit {
    timeout?: number;
  }
}

export {};

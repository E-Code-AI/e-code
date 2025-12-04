export interface StoredTodo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "todos";

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const safeParseJson = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const loadTodos = (): StoredTodo[] => {
  if (!isBrowser) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParseJson<StoredTodo[]>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.completed === "boolean" &&
      typeof item.createdAt === "string" &&
      typeof item.updatedAt === "string"
  );
};

export const saveTodos = (todos: StoredTodo[]): void => {
  if (!isBrowser) return;
  try {
    const serialized = JSON.stringify(todos);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Swallow errors to avoid breaking the app due to storage issues
  }
};

export const clearTodos = (): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Swallow errors
  }
};

export const storageKey = STORAGE_KEY;
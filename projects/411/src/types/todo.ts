export type TodoId = string;

export interface Todo {
  id: TodoId;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface NewTodoInput {
  title: string;
}

export interface UpdateTodoInput {
  id: TodoId;
  title?: string;
  completed?: boolean;
}

export enum TodoFilter {
  All = "all",
  Active = "active",
  Completed = "completed",
}

export type TodoList = Todo[];

export interface TodoState {
  items: TodoList;
  filter: TodoFilter;
  isLoading: boolean;
  error?: string | null;
}

export interface ToggleTodoPayload {
  id: TodoId;
}

export interface RemoveTodoPayload {
  id: TodoId;
}

export interface SetFilterPayload {
  filter: TodoFilter;
}
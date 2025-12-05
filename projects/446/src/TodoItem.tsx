import React, { useCallback } from "react";

export type TodoItemData = {
  id: string;
  title: string;
  completed: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type TodoItemProps = {
  todo: TodoItemData;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newTitle: string) => void;
  disabled?: boolean;
};

const formatDate = (value?: string | Date): string | null => {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggleComplete,
  onDelete,
  onEdit,
  disabled = false,
}) => {
  const handleToggle = useCallback(() => {
    if (disabled || !onToggleComplete) return;
    onToggleComplete(todo.id, !todo.completed);
  }, [disabled, onToggleComplete, todo.id, todo.completed]);

  const handleDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (disabled || !onDelete) return;
      onDelete(todo.id);
    },
    [disabled, onDelete, todo.id]
  );

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !onEdit) return;
      const newTitle = event.target.value;
      onEdit(todo.id, newTitle);
    },
    [disabled, onEdit, todo.id]
  );

  const createdLabel = formatDate(todo.createdAt);
  const updatedLabel = formatDate(todo.updatedAt);

  return (
    <li
      className="todo-item"
      aria-label={todo.title}
      aria-checked={todo.completed}
      role="listitem"
    >
      <label className="todo-item-main">
        <input
          type="checkbox"
          className="todo-item-checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          disabled={disabled}
          aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
        />
        <input
          type="text"
          className={`todo-item-titleundefined`}
          value={todo.title}
          onChange={handleTitleChange}
          disabled={disabled}
          aria-label="Edit todo title"
        />
      </label>

      <div className="todo-item-meta">
        {createdLabel && (
          <span className="todo-item-meta-text" aria-label={`Created at undefined`}>
            Created: {createdLabel}
          </span>
        )}
        {updatedLabel && (
          <span className="todo-item-meta-text" aria-label={`Last updated at undefined`}>
            Updated: {updatedLabel}
          </span>
        )}
      </div>

      <button
        type="button"
        className="todo-item-delete"
        onClick={handleDelete}
        disabled={disabled}
        aria-label={`Delete todo: undefined`}
      >
        ×
      </button>
    </li>
  );
};

export default TodoItem;
import React from "react";

export interface CounterProps {
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
  label?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

const buttonBaseClass =
  "px-3 py-1 rounded border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
const decrementButtonClass =
  "mr-2 " +
  buttonBaseClass +
  " border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-400";
const incrementButtonClass =
  "ml-2 " +
  buttonBaseClass +
  " border-blue-600 text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";

export const Counter: React.FC<CounterProps> = ({
  count,
  onIncrement,
  onDecrement,
  label,
  min,
  max,
  disabled = false,
  className = "",
}) => {
  const isDecrementDisabled =
    disabled || (typeof min === "number" && count <= min);
  const isIncrementDisabled =
    disabled || (typeof max === "number" && count >= max);

  const handleDecrement = () => {
    if (!isDecrementDisabled) {
      onDecrement();
    }
  };

  const handleIncrement = () => {
    if (!isIncrementDisabled) {
      onIncrement();
    }
  };

  return (
    <div className={`inline-flex flex-col items-start undefined`}>
      {label && (
        <span className="mb-1 text-sm font-medium text-gray-700">{label}</span>
      )}
      <div className="inline-flex items-center">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={isDecrementDisabled}
          aria-label="Decrement value"
          className={decrementButtonClass}
        >
          -
        </button>
        <span
          className="min-w-[2.5rem] text-center text-base font-semibold text-gray-900"
          aria-live="polite"
          aria-atomic="true"
        >
          {count}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={isIncrementDisabled}
          aria-label="Increment value"
          className={incrementButtonClass}
        >
          +
        </button>
      </div>
      {(typeof min === "number" || typeof max === "number") && (
        <span className="mt-1 text-xs text-gray-500">
          {typeof min === "number" && typeof max === "number"
            ? `Range: undefined – undefined`
            : typeof min === "number"
            ? `Min: undefined`
            : `Max: undefined`}
        </span>
      )}
    </div>
  );
};

export default Counter;
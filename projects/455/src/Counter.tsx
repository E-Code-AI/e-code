import React, { useCallback, useState } from "react";

export interface CounterProps {
  initialValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  className?: string;
}

export const Counter: React.FC<CounterProps> = ({
  initialValue = 0,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  onChange,
  className = "",
}) => {
  const [value, setValue] = useState<number>(() => {
    const clamped = Math.min(Math.max(initialValue, min), max);
    return Number.isFinite(clamped) ? clamped : 0;
  });

  const updateValue = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, min), max);
      setValue(clamped);
      if (onChange) {
        onChange(clamped);
      }
    },
    [min, max, onChange]
  );

  const handleIncrement = useCallback(() => {
    updateValue(value + step);
  }, [value, step, updateValue]);

  const handleDecrement = useCallback(() => {
    updateValue(value - step);
  }, [value, step, updateValue]);

  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={!canDecrement}
        aria-label="Decrement value"
        style={{
          padding: "0.25rem 0.5rem",
          cursor: canDecrement ? "pointer" : "not-allowed",
        }}
      >
        -
      </button>
      <span
        aria-live="polite"
        style={{
          minWidth: "2rem",
          textAlign: "center",
        }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={!canIncrement}
        aria-label="Increment value"
        style={{
          padding: "0.25rem 0.5rem",
          cursor: canIncrement ? "pointer" : "not-allowed",
        }}
      >
        +
      </button>
    </div>
  );
};

export default Counter;
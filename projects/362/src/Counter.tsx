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
  const clamp = useCallback(
    (value: number): number => {
      if (value < min) return min;
      if (value > max) return max;
      return value;
    },
    [min, max]
  );

  const [value, setValue] = useState<number>(() => clamp(initialValue));

  const updateValue = useCallback(
    (next: number) => {
      const clamped = clamp(next);
      setValue(clamped);
      if (onChange) {
        onChange(clamped);
      }
    },
    [clamp, onChange]
  );

  const handleIncrement = useCallback(() => {
    updateValue(value + step);
  }, [value, step, updateValue]);

  const handleDecrement = useCallback(() => {
    updateValue(value - step);
  }, [value, step, updateValue]);

  const handleReset = useCallback(() => {
    updateValue(initialValue);
  }, [initialValue, updateValue]);

  const canIncrement = value + step <= max;
  const canDecrement = value - step >= min;
  const canReset = value !== clamp(initialValue);

  return (
    <div
      className={`counter-container undefined`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.75rem",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={!canDecrement}
        aria-label="Decrement value"
        style={{
          padding: "0.4rem 0.7rem",
          borderRadius: "0.375rem",
          border: "1px solid #d1d5db",
          backgroundColor: canDecrement ? "#f9fafb" : "#f3f4f6",
          color: canDecrement ? "#111827" : "#9ca3af",
          cursor: canDecrement ? "pointer" : "not-allowed",
          fontSize: "0.875rem",
          lineHeight: 1.25,
        }}
      >
        -
      </button>

      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          minWidth: "3rem",
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          fontSize: "1rem",
          fontWeight: 500,
          color: "#111827",
        }}
      >
        {value}
      </div>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={!canIncrement}
        aria-label="Increment value"
        style={{
          padding: "0.4rem 0.7rem",
          borderRadius: "0.375rem",
          border: "1px solid #d1d5db",
          backgroundColor: canIncrement ? "#f9fafb" : "#f3f4f6",
          color: canIncrement ? "#111827" : "#9ca3af",
          cursor: canIncrement ? "pointer" : "not-allowed",
          fontSize: "0.875rem",
          lineHeight: 1.25,
        }}
      >
        +
      </button>

      <button
        type="button"
        onClick={handleReset}
        disabled={!canReset}
        aria-label="Reset value"
        style={{
          marginLeft: "0.5rem",
          padding: "0.35rem 0.75rem",
          borderRadius: "9999px",
          border: "1px solid #e5e7eb",
          backgroundColor: canReset ? "#eff6ff" : "#f9fafb",
          color: canReset ? "#1d4ed8" : "#9ca3af",
          cursor: canReset ? "pointer" : "not-allowed",
          fontSize: "0.75rem",
          lineHeight: 1.25,
          whiteSpace: "nowrap",
        }}
      >
        Reset
      </button>
    </div>
  );
};

export default Counter;
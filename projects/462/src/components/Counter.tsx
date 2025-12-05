import React, { useCallback, useEffect, useState } from "react";

export interface CounterProps {
  initialValue?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

const clamp = (value: number, min?: number, max?: number): number => {
  let result = value;
  if (typeof min === "number") {
    result = Math.max(result, min);
  }
  if (typeof max === "number") {
    result = Math.min(result, max);
  }
  return result;
};

export const Counter: React.FC<CounterProps> = ({
  initialValue = 0,
  min,
  max,
  step = 1,
  label,
  ariaLabel,
  disabled = false,
  onChange,
  className = "",
}) => {
  const [value, setValue] = useState<number>(() => clamp(initialValue, min, max));

  useEffect(() => {
    setValue((prev) => clamp(prev, min, max));
  }, [min, max]);

  const handleChange = useCallback(
    (nextValue: number) => {
      const clamped = clamp(nextValue, min, max);
      setValue(clamped);
      if (onChange) {
        onChange(clamped);
      }
    },
    [min, max, onChange]
  );

  const handleIncrement = useCallback(() => {
    if (disabled) return;
    handleChange(value + step);
  }, [disabled, handleChange, step, value]);

  const handleDecrement = useCallback(() => {
    if (disabled) return;
    handleChange(value - step);
  }, [disabled, handleChange, step, value]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (raw === "") {
        setValue(NaN);
        return;
      }
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) {
        handleChange(parsed);
      }
    },
    [handleChange]
  );

  const handleInputBlur = useCallback(() => {
    if (Number.isNaN(value)) {
      const fallback = clamp(initialValue, min, max);
      setValue(fallback);
      if (onChange) {
        onChange(fallback);
      }
    } else {
      const clamped = clamp(value, min, max);
      if (clamped !== value) {
        setValue(clamped);
        if (onChange) {
          onChange(clamped);
        }
      }
    }
  }, [initialValue, min, max, onChange, value]);

  const isDecrementDisabled =
    disabled || (typeof min === "number" && !Number.isNaN(value) && value <= min);
  const isIncrementDisabled =
    disabled || (typeof max === "number" && !Number.isNaN(value) && value >= max);

  const resolvedAriaLabel = ariaLabel || label || "Counter";

  return (
    <div className={`counter undefined`.trim()}>
      {label && (
        <label className="counter__label">
          {label}
        </label>
      )}
      <div className="counter__controls">
        <button
          type="button"
          className="counter__button counter__button--decrement"
          onClick={handleDecrement}
          disabled={isDecrementDisabled}
          aria-label="Decrement value"
        >
          -
        </button>
        <input
          type="number"
          className="counter__input"
          value={Number.isNaN(value) ? "" : value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          aria-label={resolvedAriaLabel}
          aria-valuemin={typeof min === "number" ? min : undefined}
          aria-valuemax={typeof max === "number" ? max : undefined}
          aria-valuenow={Number.isNaN(value) ? undefined : value}
          disabled={disabled}
        />
        <button
          type="button"
          className="counter__button counter__button--increment"
          onClick={handleIncrement}
          disabled={isIncrementDisabled}
          aria-label="Increment value"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;
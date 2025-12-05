import React, { useCallback, useState } from "react";

export interface CounterProps {
  initialValue?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  onChange?: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export const Counter: React.FC<CounterProps> = ({
  initialValue = 0,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  label,
  onChange,
  className = "",
  disabled = false,
}) => {
  const [value, setValue] = useState<number>(() => {
    const clamped = Math.min(Math.max(initialValue, min), max);
    return Number.isFinite(clamped) ? clamped : 0;
  });

  const isDecrementDisabled = disabled || value - step < min;
  const isIncrementDisabled = disabled || value + step > max;

  const updateValue = useCallback(
    (nextValue: number) => {
      const clamped = Math.min(Math.max(nextValue, min), max);
      setValue(clamped);
      if (onChange) {
        onChange(clamped);
      }
    },
    [min, max, onChange]
  );

  const handleDecrement = useCallback(() => {
    if (isDecrementDisabled) return;
    updateValue(value - step);
  }, [isDecrementDisabled, updateValue, value, step]);

  const handleIncrement = useCallback(() => {
    if (isIncrementDisabled) return;
    updateValue(value + step);
  }, [isIncrementDisabled, updateValue, value, step]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (raw === "") {
        setValue(NaN);
        return;
      }
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) return;
      updateValue(parsed);
    },
    [updateValue]
  );

  const handleInputBlur = useCallback(() => {
    if (Number.isNaN(value)) {
      const fallback = Math.min(Math.max(initialValue, min), max);
      const normalized = Number.isFinite(fallback) ? fallback : 0;
      setValue(normalized);
      if (onChange) {
        onChange(normalized);
      }
    } else {
      const clamped = Math.min(Math.max(value, min), max);
      if (clamped !== value) {
        setValue(clamped);
        if (onChange) {
          onChange(clamped);
        }
      }
    }
  }, [value, initialValue, min, max, onChange]);

  const containerClassName = `counter undefined`.trim();

  return (
    <div className={containerClassName} aria-disabled={disabled}>
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
          min={Number.isFinite(min) ? min : undefined}
          max={Number.isFinite(max) ? max : undefined}
          step={step}
          disabled={disabled}
          aria-label={label || "Counter value"}
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
import React, { useCallback, useState } from "react";

export interface CounterProps {
  initialValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Counter: React.FC<CounterProps> = ({
  initialValue = 0,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  onChange,
  label,
  disabled = false,
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
    if (disabled) return;
    updateValue(value + step);
  }, [disabled, step, updateValue, value]);

  const handleDecrement = useCallback(() => {
    if (disabled) return;
    updateValue(value - step);
  }, [disabled, step, updateValue, value]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const nextValue = Number(event.target.value);
      if (Number.isNaN(nextValue)) return;
      updateValue(nextValue);
    },
    [disabled, updateValue]
  );

  const canDecrement = !disabled && value - step >= min;
  const canIncrement = !disabled && value + step <= max;

  return (
    <div className={`counter undefined`.trim()}>
      {label && (
        <label className="counter__label" aria-label={label}>
          {label}
        </label>
      )}
      <div className="counter__controls">
        <button
          type="button"
          className="counter__button counter__button--decrement"
          onClick={handleDecrement}
          disabled={!canDecrement}
          aria-label="Decrement value"
        >
          -
        </button>
        <input
          type="number"
          className="counter__input"
          value={value}
          onChange={handleInputChange}
          min={Number.isFinite(min) ? min : undefined}
          max={Number.isFinite(max) ? max : undefined}
          step={step}
          disabled={disabled}
          aria-live="polite"
        />
        <button
          type="button"
          className="counter__button counter__button--increment"
          onClick={handleIncrement}
          disabled={!canIncrement}
          aria-label="Increment value"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;
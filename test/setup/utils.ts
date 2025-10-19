function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

export function matchObject(target: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  return Object.entries(expected).every(([key, value]) => {
    if (!(key in target)) {
      return false;
    }

    const targetValue = target[key];

    if (isObject(value) && isObject(targetValue)) {
      return matchObject(targetValue, value as Record<string, unknown>);
    }

    if (Array.isArray(value) && Array.isArray(targetValue)) {
      return value.every((item, index) => deepEqual(item, targetValue[index]));
    }

    return deepEqual(targetValue, value);
  });
}

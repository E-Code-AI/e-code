export interface RuntimeDependencyAvailability {
  dockerAvailable: boolean;
  nixAvailable: boolean;
  languages: Record<string, boolean>;
}

type LegacyDependenciesShape = {
  docker?: boolean;
  nix?: boolean;
  languages?: Record<string, boolean>;
};

type DetailedDependenciesShape = {
  dependencies?: {
    docker?: { available?: boolean };
    nix?: { available?: boolean };
    languages?: Record<string, { available?: boolean }>;
  };
};

export function normalizeRuntimeDependencies(
  payload: unknown,
): RuntimeDependencyAvailability {
  const legacy = (payload ?? {}) as LegacyDependenciesShape;
  const detailed = (payload ?? {}) as DetailedDependenciesShape;
  const detailedDependencies = detailed.dependencies;

  if (detailedDependencies) {
    return {
      dockerAvailable: Boolean(detailedDependencies.docker?.available),
      nixAvailable: Boolean(detailedDependencies.nix?.available),
      languages: Object.fromEntries(
        Object.entries(detailedDependencies.languages ?? {}).map(([language, info]) => [
          language,
          Boolean(info?.available),
        ]),
      ),
    };
  }

  return {
    dockerAvailable: Boolean(legacy.docker),
    nixAvailable: Boolean(legacy.nix),
    languages: legacy.languages ?? {},
  };
}

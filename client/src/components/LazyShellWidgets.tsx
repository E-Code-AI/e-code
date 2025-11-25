import { Suspense, lazy } from "react";

const SpotlightSearch = lazy(() => import("@/components/SpotlightSearch").then(mod => ({ default: mod.SpotlightSearch })));
const CommandPalette = lazy(() => import("@/components/CommandPalette").then(mod => ({ default: mod.CommandPalette })));

export function LazyShellWidgets() {
  return (
    <Suspense fallback={null}>
      <SpotlightSearch />
      <CommandPalette />
    </Suspense>
  );
}

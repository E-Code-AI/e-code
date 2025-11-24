/**
 * AppToaster - Wrapper pour Sonner Toaster compatible avec notre ThemeContext
 */

import { Toaster as SonnerToaster } from "sonner@2.0.3";
import { useTheme } from "../contexts/ThemeContext";

export function AppToaster({ position = "bottom-right" }: { position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center" }) {
  const { actualTheme } = useTheme();

  return (
    <SonnerToaster
      position={position}
      theme={actualTheme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
    />
  );
}

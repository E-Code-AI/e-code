import React, { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex flex-col rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 ring-1 ring-transparent backdrop-blur-sm transition-all duration-200",
        "dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none",
        "hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/5 hover:ring-slate-900/5",
        "dark:hover:ring-slate-100/5",
        className
      )}
      {...props}
    />
  );
});

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-1.5 border-b border-slate-100 px-6 pb-4 pt-5",
          "dark:border-slate-800",
          className
        )}
        {...props}
      />
    );
  }
);

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children?: ReactNode;
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn(
          "text-base font-semibold tracking-tight text-slate-900",
          "dark:text-slate-50",
          className
        )}
        {...props}
      />
    );
  }
);

export interface CardDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  function CardDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn(
          "text-sm text-slate-500 leading-relaxed",
          "dark:text-slate-400",
          className
        )}
        {...props}
      />
    );
  }
);

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  function CardContent({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("flex-1 px-6 py-4 space-y-3", className)}
        {...props}
      />
    );
  }
);

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4",
          "dark:border-slate-800",
          className
        )}
        {...props}
      />
    );
  }
);

export interface CardBadgeProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  variant?: "default" | "highlight";
}

const CardBadge = forwardRef<HTMLDivElement, CardBadgeProps>(
  function CardBadge({ className, variant = "default", ...props }, ref) {
    const baseClasses =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
    const variantClasses =
      variant === "highlight"
        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/40"
        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";

    return (
      <div
        ref={ref}
        className={cn(baseClasses, variantClasses, className)}
        {...props}
      />
    );
  }
);

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardBadge,
};
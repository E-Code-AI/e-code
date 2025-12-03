"use client";

import React from "react";
import Link from "next/link";

type Feature = {
  title: string;
  description: string;
  icon: JSX.Element;
};

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  avatarInitials: string;
};

const features: Feature[] = [
  {
    title: "Lightning-fast setup",
    description:
      "Go from idea to live experience in minutes with zero configuration and sensible defaults.",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"
      >
        ⚡
      </span>
    ),
  },
  {
    title: "Built for teams",
    description:
      "Collaborate in real time, share context, and keep everyone aligned in a single workspace.",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
      >
        🤝
      </span>
    ),
  },
  {
    title: "Secure by default",
    description:
      "Enterprise-grade security, SSO, and audit logs baked into the core platform.",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
      >
        🔒
      </span>
    ),
  },
  {
    title: "Scales with you",
    description:
      "From early-stage startups to global organizations, we grow with your needs.",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100"
      >
        📈
      </span>
    ),
  },
  {
    title: "Actionable insights",
    description:
      "Turn raw activity into clear, visual insights that drive better decisions.",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100"
      >
        📊
      </span>
    ),
  },
  {
    title: "API-first architecture",
    description:
      "Integrate with your existing tools and workflows using our modern, well-documented API.",
    icon: (
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100"
      >
        🧩
      </span>
    ),
  },
];

const testimonials: Testimonial[] = [
  {
    name: "Alex Rivera",
    role: "Head of Product, Northwind",
    quote:
      "We replaced three different tools with this platform and finally have a single source of truth for our team.",
    avatarInitials: "AR",
  },
  {
    name: "Jordan Lee",
    role: "Founder, Acme Labs",
    quote:
      "The onboarding experience was seamless. We were fully set up and seeing value in under an hour.",
    avatarInitials: "JL",
  },
  {
    name: "Taylor Morgan",
    role: "Operations Lead, Contoso",
    quote:
      "The insights we get now are night and day compared to what we had before. It’s become a daily habit for our team.",
    avatarInitials: "TM",
  },
];

const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: string }
> = ({ children, href, className = "", ...props }) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";
  if (href) {
    return (
      <Link href={href} className={`undefined undefined`}>
        {children}
      </Link>
    );
  }
  return (
    <button className={`undefined undefined`} {...props}>
      {children}
    </button>
  );
};

const SecondaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: string }
> = ({ children, href, className = "", ...props }) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";
  if (href) {
    return (
      <Link href={href} className={`undefined undefined`}>
        {children}
      </Link>
    );
  }
  return (
    <button className={`undefined undefined`} {...props}>
      {children}
    </button>
  );
};

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
    {children}
  </span>
);

const Page: React.FC = () => {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="relative isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl"
        >
          <div className="relative left-1/2 aspect-[1108/632] w-[72.1875rem] -translate-x-1/2 bg-gradient-to-tr from-blue-500 via-sky-400 to-emerald-400 opacity-25" />
        </div>

        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-sky-400 text-xl font-black text-white shadow-lg shadow-blue-500/40">
              L
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-50">
              Lumina
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-200 md:flex">
            <Link
              href="#features"
              className="transition hover:text-white hover:underline hover:underline-offset-4"
            >
              Features
            </Link>
            <Link
              href="#testimonials"
              className="transition hover:text-white hover:underline hover:underline-offset-4"
            >
              Customers
            </Link>
            <Link
              href="#cta"
              className="transition hover:text-white hover:underline hover:underline-offset-4"
            >
              Pricing
            </Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <SecondaryButton href="/login" className="px-4 py-2 text-xs">
              Sign in
            </SecondaryButton>
            <PrimaryButton href="#cta" className="px-4 py-2 text-xs">
              Get started
            </PrimaryButton>
          </div>
        </header>

        <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:pb-24">
          <div className="max-w-xl space-y-8">
            <Badge>New · Teams launch workspace in under 5 minutes</Badge>
            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                The operating system
                <span className="block bg-gradient-to-r from-sky-300 via-emerald-300 to-blue-300 bg-clip-text text-transparent">
                  for modern teams.
                </span>
              </h1>
              <p className="text-balance text-sm leading-relaxed text-slate-200 sm:text-base">
                Lumina brings your projects, people, and insights together in
                one place—so you can move faster,
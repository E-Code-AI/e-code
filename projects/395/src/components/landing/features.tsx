import React from "react";

type Feature = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const IconPerformance: React.FC = () => (
  <svg
    className="h-10 w-10 text-indigo-500"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 3a9 9 0 0 0-9 9c0 1.61.42 3.12 1.16 4.43.25.45.86.48 1.16.06A7 7 0 0 1 12 9a7 7 0 0 1 6.68 7.49c-.03.51.37.95.88.95h.06c.39 0 .73-.28.86-.66A9 9 0 0 0 12 3Z"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 13.5 9.75 18M12 13.5l3.5-2"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx={12}
      cy={19.5}
      r={1.25}
      stroke="currentColor"
      strokeWidth={1.5}
    />
  </svg>
);

const IconSecurity: React.FC = () => (
  <svg
    className="h-10 w-10 text-indigo-500"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 3 5 5.5v6.25c0 4.02 2.86 7.69 7 8.75 4.14-1.06 7-4.73 7-8.75V5.5L12 3Z"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 11.5a2 2 0 1 1 4 0v1.25a2 2 0 0 1-2 2V16m0 0h.01"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconAutomation: React.FC = () => (
  <svg
    className="h-10 w-10 text-indigo-500"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx={12}
      cy={12}
      r={3.25}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 12h1.5M18.5 12H20M12 4v1.5M12 18.5V20M6.22 6.22l1.06 1.06M16.72 16.72l1.06 1.06M6.22 17.78l1.06-1.06M16.72 7.28l1.06-1.06"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCollaboration: React.FC = () => (
  <svg
    className="h-10 w-10 text-indigo-500"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx={8}
      cy={9}
      r={2.5}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx={16}
      cy={9}
      r={2.5}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 17.5c.6-1.7 2.1-3 3.9-3h.2c1.8 0 3.3 1.3 3.9 3M11.5 17.5c.6-1.7 2.1-3 3.9-3h.2c1.8 0 3.3 1.3 3.9 3"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconAnalytics: React.FC = () => (
  <svg
    className="h-10 w-10 text-indigo-500"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5 19V9.5M12 19V5M19 19v-6.5"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 19h16"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
    />
  </svg>
);

const IconSupport: React.FC = () => (
  <svg
    className="h-10 w-10 text-indigo-500"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx={12}
      cy={12}
      r={7}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.75 10.25a2.25 2.25 0 1 1 4.5 0c0 1.5-2.25 1.875-2.25 3.375M12 16.25h.01"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const features: Feature[] = [
  {
    id: "performance",
    title: "Blazing-fast performance",
    description:
      "Optimized rendering, smart caching, and edge-ready delivery ensure your experience stays fast at any scale.",
    icon: <IconPerformance />,
  },
  {
    id: "security",
    title: "Enterprise-grade security",
    description:
      "Built-in best practices, secure defaults, and audit-ready logging keep your data and workflows protected.",
    icon: <IconSecurity />,
  },
  {
    id: "automation",
    title: "Powerful automation",
    description:
      "Automate repetitive tasks with flexible workflows, triggers, and integrations that adapt to your stack.",
    icon: <IconAutomation />,
  },
  {
    id: "collaboration",
    title: "Team-first collaboration",
    description:
      "Shared workspaces, granular permissions, and real-time updates keep everyone aligned and productive.",
    icon: <IconCollaboration />,
  },
  {
    id: "analytics",
    title: "Actionable analytics",
    description:
      "Track key metrics, uncover trends, and make informed decisions with built-in dashboards and reports.",
    icon: <IconAnalytics />,
  },
  {
    id: "support",
    title: "Dedicated support",
    description:
      "Access responsive, expert help whenever you need it, with onboarding guidance and ongoing best practices.",
    icon: <IconSupport />,
  },
];

export const Features: React.FC = () => {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="bg-slate-950 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
            Features
          </p>
          <h2
            id="features-heading"
            className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Everything you need to ship with confidence.
          </h2>
          <p className="
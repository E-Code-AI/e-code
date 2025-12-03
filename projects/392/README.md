# SaaS Starter Kit

A modern, production-ready SaaS starter kit that gives you everything you need to launch a subscription-based web application quickly and reliably.

This starter kit includes:

- Marketing landing page
- Authentication (email/password, magic links, OAuth-ready)
- Subscription billing (Stripe)
- Team accounts and invitations
- Admin dashboard
- Transactional emails
- API with documentation
- Production-ready configuration (env, logging, error handling, security)

Use it as a foundation to build and ship your SaaS faster, with best practices baked in.

---

## Features

### Landing Page

- Responsive, SEO-friendly marketing site
- Hero, feature highlights, pricing, FAQ, and CTA sections
- Analytics-ready (plug in your provider of choice)
- Meta tags and Open Graph tags for social sharing
- Simple content structure for easy customization

### Authentication

- Email/password authentication
- Secure session management
- Password reset and email verification flows
- Magic link login (optional, configurable)
- OAuth provider support (Google/GitHub/etc.) ready to plug in
- Rate-limited auth endpoints and brute-force protection

### Billing

- Stripe-based subscription billing
- Support for multiple plans and pricing tiers
- Free trials and metered billing ready to extend
- Webhook handling for subscription lifecycle events
- Automatic sync of customer and subscription status
- Graceful handling of payment failures and cancellations
- Customer portal integration (Stripe Billing Portal ready)

### Teams & Collaboration

- Personal and team-based workspaces
- Team creation and management
- Role-based access (owner, admin, member)
- Team invitations via email
- Ability to switch between teams
- Hooks and utilities for building team-scoped features

### Admin Dashboard

- Secure admin-only area
- User management (search, filter, view details)
- Subscription and billing overview
- Basic metrics and health checks
- Feature flags and configuration toggles (extensible)
- Audit logs foundation (extensible)

### Emails

- Transactional email templates (auth, invites, billing)
- Local email preview for development
- Provider-agnostic email sending abstraction
- Production-ready integration with major providers (e.g., SendGrid, Postmark, SES) via environment configuration
- HTML + text email support

### API & Documentation

- Versioned REST-style API
- Authenticated and public endpoints
- Typed request/response contracts
- Error handling with consistent error shapes
- Auto-generated API docs (OpenAPI/Swagger-style) served via a docs route
- Example API usage snippets

### Developer Experience

- Modern full-stack framework
- TypeScript end-to-end
- ESLint + Prettier + formatting on save
- Environment variable validation
- Centralized configuration
- Structured logging
- Unit and integration test setup
- Production-ready Dockerfile (optional)
- CI-friendly scripts

---

## Tech Stack

- Framework: Next.js (App Router) or similar modern React-based framework
- Language: TypeScript
- UI: React + Tailwind CSS (or similar utility-first CSS)
- Auth: First-class auth library (e.g., NextAuth/Auth.js or custom JWT sessions)
- Database: PostgreSQL (via Prisma ORM or similar)
- Billing: Stripe
- Emails: Provider-agnostic abstraction (e.g., nodemailer + provider transport)
- API Docs: OpenAPI/Swagger generation and UI
- Tooling: ESLint, Prettier, testing framework (Jest/Vitest), package manager (pnpm/yarn/npm)

Note: The exact stack may vary slightly depending on your chosen implementation, but the structure and concepts remain the same.

---

## Project Structure

A typical structure for this starter kit:

- /app or /src
  - /app (or /pages)
    - / (landing page)
    - /auth (login, register, reset password, verify email)
    - /dashboard (user dashboard)
    - /teams (team management)
    - /admin (admin dashboard)
    - /api (API routes)
    - /docs/api (API documentation UI)
  - /components (shared UI components)
  - /features (feature-specific modules: auth, billing, teams, admin, emails)
  - /lib (utilities, config, helpers)
  - /server (server-only logic, services, and handlers)
  - /styles (global styles, Tailwind config)
- /prisma or /db (database schema and migrations)
- /scripts (maintenance and automation scripts)
- /tests (unit and integration tests)
- .env.example (environment variable template)
- package.json (scripts and dependencies)
- README.md (this file)

Use this as a guide; the actual repo may have additional folders for CI, Docker, or deployment.

---

## Prerequisites

Before you start, make sure you have:

- Node.js (LTS recommended)
- Package manager: pnpm, yarn, or npm
- PostgreSQL database (local or remote)
- Stripe account and API keys
- Email provider account (optional for local dev, required for production)
- Git (for version control)

---

## Getting Started (Quickstart)

This section walks you through:

1. Cloning the project
2. Installing dependencies
3. Configuring environment variables
4. Setting up the database
5. Running the development server
6. Building and running in production

### 1. Clone the Repository

Use Git to clone the starter kit:

git clone https://github.com/your-org/saas-starter-kit.git
cd saas-starter-kit

(Replace the URL with your actual repository.)

### 2. Install Dependencies

Install dependencies using your preferred package manager.

Using pnpm:

pnpm install

Using yarn:

yarn install

Using npm:

npm install

### 3. Configure Environment Variables

Copy the example environment file and fill in the required values:

cp .env.example .env.local

Open .env.local and configure:

- Application
  - APP_URL
  - NODE_ENV
- Database
  - DATABASE_URL
- Auth
  - AUTH_SECRET (or NEXTAUTH_SECRET / JWT_SECRET depending on implementation)
  - OAuth provider keys (if using Google/GitHub/etc.)
- Stripe
  - STRIPE_SECRET_KEY
  - STRIPE_PUBLISHABLE_KEY
  - STRIPE_WEBHOOK_SECRET
  - STRIPE_PRICE_IDS (for your plans)
- Email
  - EMAIL_FROM
  - EMAIL_PROVIDER_API_KEY or SMTP_* variables
- Other
  - Any analytics keys (e.g., POSTHOG_KEY, PLAUSIBLE_DOMAIN, etc.)

Ensure that:

- DATABASE_URL points to a valid PostgreSQL instance
- Stripe keys are from your test mode for development
- Email provider keys can be omitted in development if using local preview

### 4. Set Up the Database

Run database migrations to create the schema:

Using Prisma (example):

npx prisma migrate dev

Or use the provided script:

pnpm db:migrate
yarn db:migrate
npm run db:migrate

(Optional) Seed the database with initial data:

pnpm db:seed
yarn db:seed
npm run db:seed

Check your database to confirm that tables and seed data exist.

### 5. Run the Development Server

Start the dev server:

pnpm dev
yarn dev
npm run dev

Then open your browser at:

http://localhost:3000

You should see the landing page. From there you can:

- Sign up for a new account
- Log in
- Create a team
- Access the dashboard
- Visit the admin area (once you mark your user as admin in the DB)
- Explore the API docs route (e.g., /docs/api)

### 6. Build and Run in Production

To create an optimized production build:

pnpm build
yarn build
npm run build

Then start the production server:

pnpm start
yarn start
npm start

Make sure that:

- NODE_ENV is set to production
- All production environment variables are configured (database, Stripe, email, etc.)
- Any reverse proxy (e.g., Nginx) or platform configuration (Vercel, Fly.io, Render, etc.) is set up to forward traffic to the app

---

## Feature Walkthrough

### Landing Page

- Located at the root route (/)
- Built with reusable components for hero, features, pricing, and FAQs
- SEO-ready with configurable metadata
- Easy to customize copy and branding

To customize:

- Update the content configuration (e.g., /lib/marketing or /content)
- Adjust Tailwind theme or global styles
- Replace logos and images in the public assets folder

### Authentication

Core flows:

- Sign up with email/password
- Log in with email/password
- Email verification (optional but recommended)
- Password reset via email
- Magic link login (if enabled)
- OAuth login (if configured)

Key concepts:

- Secure session cookies or JWT-based sessions
- Server-side session validation for protected routes
- Client-side hooks for accessing the current user and auth state
- Middleware/route guards for protected pages and APIs

To configure:

- Set auth-related environment variables (secrets, OAuth keys)
- Adjust auth options (session duration, verification requirements)
- Customize email templates for auth-related emails

### Billing & Subscriptions

Stripe integration includes:

- Customer creation and linking to your user accounts
- Subscription creation and management
- Webhook handling for:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_failed
- Plan and price configuration via environment variables or
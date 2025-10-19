# Getting Started with E‑Code

This guide helps engineers and solution architects bootstrap a reliable local environment, connect to external services, and verify that the core IDE experience works end to end.

## 1. Prepare Your Environment

### Software Requirements

- **Node.js**: Version 18 or later.
- **npm**: Version 10 or later.
- **PostgreSQL**: Version 15 (local Docker container or managed instance).
- **Optional**: Docker Desktop for container orchestration features and Redis if you plan to exercise rate limiting and job queues.

### Clone the Repository

```bash
git clone https://github.com/E-Code-AI/e-code.git
cd e-code
```

### Install Dependencies

```bash
npm install
```

If you encounter network restrictions, configure the corporate proxy using the standard `npm config set proxy` command before installation.

## 2. Configure Environment Variables

Copy the production-ready template and adjust it for local development:

```bash
cp .env.production.example .env
```

Minimum variables to review:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Connection string for the PostgreSQL instance (e.g., `postgresql://ecode:password@localhost:5432/ecode_dev`). |
| `SESSION_SECRET` | Random 32+ character string used to sign session cookies. |
| `OPENAI_API_KEY` | Optional API key enabling GPT-based code assistance. |
| `ANTHROPIC_API_KEY` | Optional API key enabling Claude workflows. |
| `GOOGLE_GENAI_API_KEY` | Optional API key enabling Gemini tooling. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowlist of origins if using non-default ports. |

> **Security Note:** Avoid committing the `.env` file. Store production secrets in the organization’s secret manager (e.g., GCP Secret Manager or HashiCorp Vault).

## 3. Provision the Database

The project uses [Drizzle ORM](https://orm.drizzle.team/) to manage schema migrations.

```bash
npm run db:push
```

This command connects to the database defined in `DATABASE_URL`, creates tables, and seeds a QA-friendly dataset including the `testuser` account.

## 4. Launch the Development Stack

```bash
npm run dev
```

- The Express API and Vite dev server share port **5000**.
- The initial build may take 2–3 minutes as Monaco Editor, Radix UI, and AI SDK packages compile.
- Navigate to `http://localhost:5000` and log in with `testuser` / `testpass123`.

### Verifying Key Features

1. **Editor** – Create a new file, make edits, and confirm autosave notifications.
2. **Terminal** – Run `node -v` in the integrated terminal to confirm sandbox access.
3. **AI Assistant** – Trigger the AI sidebar and request a code explanation (requires valid API keys).
4. **Project Preview** – Launch a sample Node.js app and open the live preview tab.

## 5. Troubleshooting Checklist

| Symptom | Recommended Action |
|---------|--------------------|
| `ECONNREFUSED` from PostgreSQL | Ensure the container is running and reachable. Use `psql $DATABASE_URL -c "select now();"` to validate connectivity. |
| Blank screen in browser | Check terminal output for Vite compile errors, then restart `npm run dev`. |
| AI requests fail | Confirm API keys are present and not rate limited. Review logs in `server/logs/ai/*.log`. |
| File sync delays | Verify WebSocket connectivity; proxies must allow `ws://` upgrades to port 5000. |

## 6. Next Steps

- Review the [Product Tour](./product-tour.md) for guided demos you can deliver to stakeholders.
- Study the [Architecture Overview](./architecture/overview.md) to understand service boundaries before deploying custom integrations.
- When ready for staging, follow the [Deployment Playbook](./operations/deployment-playbook.md).

For assistance, reach the platform team at [support@e-code.dev](mailto:support@e-code.dev).

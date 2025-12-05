# AI Chat Studio

AI Chat Studio is a full-stack, production-ready AI chat application that showcases modern patterns for building with GPT-4 and Retrieval-Augmented Generation (RAG). It includes:

- GPT-4 chatbot with streaming responses
- RAG pipeline for grounding answers in your own data
- In-browser code sandbox for running and sharing code snippets
- Chat history with persistent storage
- PDF export of conversations
- Internationalization (i18n) with multiple languages
- Secure, typed API between client and server
- Development and production-ready configuration

---

## Features

### GPT-4 Chatbot

- Chat interface powered by GPT-4 (or compatible OpenAI API models)
- Streaming responses for low-latency, token-by-token updates
- System and user message handling with role separation
- Configurable model, temperature, and max tokens
- Support for function/tool calling (if enabled in the backend)

### Retrieval-Augmented Generation (RAG)

- Upload and index documents for retrieval
- Vector-based semantic search over your content
- Context injection into GPT-4 prompts
- Pluggable embedding and vector store implementation
- Configurable chunking and similarity thresholds

### Code Sandbox

- In-browser code editor with syntax highlighting
- Run code snippets safely in a sandboxed environment
- Language support (e.g., JavaScript/TypeScript) depending on configuration
- Shareable code snippets tied to chat messages
- Error capture and display in the UI

### Streaming

- Server-Sent Events (SSE) or WebSocket-based streaming (depending on implementation)
- Token-level streaming from server to client
- Graceful cancellation and abort handling
- Loading indicators and partial message rendering

### Chat History

- Persistent chat sessions stored in a database (e.g., PostgreSQL, SQLite, or another configured DB)
- List, view, and resume previous conversations
- Per-message metadata (timestamps, roles, tokens, etc.)
- Optional soft-delete or archival of old conversations

### PDF Export

- Export entire chat sessions as PDF
- Include timestamps, roles, and message formatting
- Optional inclusion of code snippets and RAG sources
- Download directly from the client

### Internationalization (i18n)

- Multi-language UI support
- Language switcher in the client
- Translation files for supported locales
- Fallback language configuration
- Easy extension to add new languages

---

## Tech Stack

- Client:
  - React (or Next.js React front-end)
  - TypeScript
  - Modern UI framework (e.g., Tailwind CSS, Chakra UI, or similar)
  - i18n library (e.g., react-i18next or next-i18next)
  - Streaming support via EventSource or WebSockets

- Server:
  - Node.js
  - TypeScript
  - Express / Next.js API routes / or similar HTTP framework
  - OpenAI (or compatible) API client
  - Vector store integration for RAG
  - Database client (e.g., Prisma, TypeORM, or direct driver)

- Infrastructure:
  - Environment-based configuration
  - Production-ready build scripts
  - Optional Docker support
  - Logging and error handling

---

## Project Structure

A typical structure for this project looks like:

- /client
  - React/Next.js front-end
  - Components, pages, hooks, and i18n configuration
- /server
  - API endpoints for chat, RAG, and sandbox
  - Database and vector store integration
  - OpenAI client and configuration
- /shared (optional)
  - Shared types and utilities between client and server
- /scripts
  - Setup, migration, and utility scripts

Your actual structure may vary slightly depending on the chosen framework, but the concepts remain the same.

---

## Prerequisites

- Node.js (LTS version recommended, e.g., 18+)
- npm, pnpm, or yarn (choose one)
- A database (if using persistent storage), e.g.:
  - PostgreSQL
  - SQLite (for local development)
- An OpenAI (or compatible) API key
- (Optional) Docker, if you want containerized deployment

---

## Environment Variables

The project uses environment variables to configure both client and server. Below is a reference of commonly used variables. Some may be server-only, some may be exposed to the client (prefixed as required by your framework, e.g., NEXT_PUBLIC_).

### Core AI Configuration

- OPENAI_API_KEY
  - Description: API key for OpenAI (or compatible) models.
  - Required: Yes (for GPT-4 and embeddings).
  - Scope: Server only.

- OPENAI_API_BASE
  - Description: Custom base URL for OpenAI-compatible APIs (e.g., Azure OpenAI, local proxy).
  - Required: No (defaults to official OpenAI endpoint).
  - Scope: Server only.

- OPENAI_MODEL_CHAT
  - Description: Default chat model (e.g., gpt-4.1, gpt-4o, gpt-4.1-mini).
  - Required: No (has a sensible default).
  - Scope: Server only.

- OPENAI_MODEL_EMBEDDING
  - Description: Embedding model for RAG (e.g., text-embedding-3-large).
  - Required: No (has a sensible default).
  - Scope: Server only.

### Server Configuration

- NODE_ENV
  - Description: Node environment (development, production, test).
  - Required: Yes.
  - Scope: Server.

- PORT
  - Description: Port for the server to listen on.
  - Required: No (defaults to 3000 or framework default).

- SERVER_URL
  - Description: Public base URL of the server (used by the client to call APIs).
  - Required: Yes in production; optional in development.
  - Scope: Client and server (may be exposed as NEXT_PUBLIC_SERVER_URL or similar).

### Database Configuration

(Adjust names to match your chosen ORM or driver.)

- DATABASE_URL
  - Description: Connection string for the primary database.
  - Required: Yes if using persistent storage.
  - Scope: Server.

- DATABASE_LOGGING
  - Description: Enable or disable DB logging (true/false).
  - Required: No (defaults to false).
  - Scope: Server.

### RAG / Vector Store Configuration

- VECTOR_STORE_PROVIDER
  - Description: Which vector store to use (e.g., local, pgvector, pinecone, etc.).
  - Required: Yes if RAG is enabled.
  - Scope: Server.

- VECTOR_STORE_URL
  - Description: Connection string or URL for the vector store (if external).
  - Required: Depends on provider.
  - Scope: Server.

- RAG_MAX_CONTEXT_TOKENS
  - Description: Maximum tokens of retrieved context to inject into prompts.
  - Required: No (has default).
  - Scope: Server.

### Code Sandbox Configuration

- SANDBOX_ENABLED
  - Description: Enable or disable the in-browser code sandbox (true/false).
  - Required: No (defaults to true in development, may be restricted in production).
  - Scope: Client and server.

- SANDBOX_EXECUTION_URL
  - Description: URL of the sandbox execution service (if external).
  - Required: Only if using a remote sandbox.
  - Scope: Server.

### Security and Auth (if applicable)

- AUTH_SECRET
  - Description: Secret key for signing tokens or sessions.
  - Required: Yes if authentication is enabled.
  - Scope: Server.

- ALLOWED_ORIGINS
  - Description: Comma-separated list of allowed CORS origins.
  - Required: Yes in production.
  - Scope: Server.

### i18n Configuration

- DEFAULT_LOCALE
  - Description: Default language code (e.g., en, es, fr).
  - Required: No (defaults to en).
  - Scope: Client and server.

- SUPPORTED_LOCALES
  - Description: Comma-separated list of supported locales (e.g., en,es,fr).
  - Required: No (defaults to en).
  - Scope: Client and server.

---

## Getting Started

This section assumes a monorepo-style layout with /client and /server. Adjust commands if your project is structured differently.

### 1. Clone the Repository

git clone https://github.com/your-org/ai-chat-studio.git
cd ai-chat-studio

### 2. Install Dependencies

Using pnpm (recommended):

pnpm install

Or using npm:

npm install

If the client and server are separate packages, you may need to install dependencies in each:

cd client
pnpm install
cd ../server
pnpm install

### 3. Configure Environment Variables

Create environment files for development:

- For the server (e.g., /server/.env):

NODE_ENV=development
PORT=3001
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL_CHAT=gpt-4.1
OPENAI_MODEL_EMBEDDING=text-embedding-3-large
DATABASE_URL=postgresql://user:password@localhost:5432/ai_chat_studio
VECTOR_STORE_PROVIDER=local
DEFAULT_LOCALE=en
SUPPORTED_LOCALES=en,es,fr

- For the client (e.g., /client/.env.local):

NEXT_PUBLIC_SERVER_URL=http://localhost:3001
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPPORTED_LOCALES=en,es,fr

Adjust variable names to match your framework’s conventions (
# E-Code Platform

<div align="center">
  <img src="client/public/assets/logo.svg" alt="E-Code Platform" width="160">
  
  <h3>The Next-Generation AI-Native IDE for Enterprise Engineering</h3>
  
  <p>
    <a href="https://github.com/e-code/platform/releases"><img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Enterprise-green.svg" alt="License"></a>
    <a href="https://github.com/e-code/platform/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build Status"></a>
    <a href="docs/security/compliance.md"><img src="https://img.shields.io/badge/security-SOC2-purple.svg" alt="Security"></a>
  </p>

  <p>
    <a href="#-platform-overview">Overview</a> •
    <a href="#-key-capabilities">Capabilities</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-deployment">Deployment</a> •
    <a href="#-enterprise-security">Security</a>
  </p>
</div>

---

## 🌐 Platform Overview

E-Code is a professional-grade, AI-native development environment designed to redefine the software engineering lifecycle. By integrating state-of-the-art autonomous agents with a high-performance cloud IDE, E-Code empowers teams to move from concept to production with unprecedented velocity.

Unlike traditional IDEs, E-Code treats AI as a first-class citizen—not just an autocomplete tool, but a collaborative partner capable of executing complex workflows, managing infrastructure, and ensuring code quality at scale.

## 🚀 Key Capabilities

### 🤖 Autonomous Engineering Agents
*   **Multi-Model Orchestration:** Support for GPT-4o, Claude 3.7 Sonnet, Gemini 2.0 Flash, Grok-3, and more.
*   **Contextual Memory Bank:** Persistent project context management for long-running autonomous tasks.
*   **Self-Healing Workflows:** Integrated Playwright-based background testing that allows agents to verify and fix their own code.

### 💻 Enterprise-Grade IDE
*   **Polyglot Runtime:** Native support for 28+ languages including TypeScript, Python, Go, Rust, and Java via Nix-managed environments.
*   **Real-Time Collaboration:** WebSocket-driven synchronization with presence indicators and collaborative cursors.
*   **Advanced Terminal:** High-performance xterm.js integration with multi-session support and persistent PID tracking.

### ⚡ Production-Ready Infrastructure
*   **Fast Bootstrap:** Sub-60-second workspace provisioning with schema "warming" technology.
*   **Database Auto-Provisioning:** Asynchronous PostgreSQL provisioning with multi-provider failover.
*   **Live Preview:** WebSocket-based hot-reload for web applications with asset path rewriting and CSS hot-swapping.

## 🏗️ Technical Architecture

### Core Components
| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React, TypeScript, Tailwind CSS | High-fidelity, responsive IDE interface |
| **Backend** | Node.js, Express, TypeScript | Business logic and API orchestration |
| **Storage** | PostgreSQL, Drizzle ORM, Redis | Persistent state and high-speed caching |
| **Orchestration** | Docker, Kubernetes | Secure, isolated code execution environments |
| **Real-time** | WebSockets, SSE | Event streaming and collaborative sync |

### System Design
E-Code utilizes a distributed two-service architecture:
1.  **Main Platform:** Manages user sessions, project metadata, and AI orchestration.
2.  **Runner Microservice:** Handles secure code execution, terminal sessions, and filesystem operations within sandboxed environments.

## 🏁 Quick Start

### Prerequisites
*   **Node.js:** 20.x LTS or higher
*   **PostgreSQL:** 16.x or higher
*   **Replit Environment:** Optimized for Replit Reserved VMs

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/e-code/platform.git
cd platform

# 2. Install dependencies
npm install

# 3. Initialize the database
# Note: Always use db:push for schema updates
npm run db:push

# 4. Start the development server
npm run dev
```

### 🔑 Essential Configuration
Configure the following environment variables in your `.env` or Replit Secrets:
*   `DATABASE_URL`: Your PostgreSQL connection string.
*   `SESSION_SECRET`: A secure string for session encryption.
*   `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`: API keys for AI capabilities.

## 🛡️ Enterprise Security

E-Code is built on a "Secure by Design" philosophy:
*   **Tenant Isolation:** Strict data partitioning at the database level using `tenant_id` scoping.
*   **Hardened Execution:** Sandboxed `DockerExecutor` with resource limits and network isolation.
*   **Security Headers:** Comprehensive CSP, XSS protection, and production-enforced CORS policies.
*   **Credential Safety:** AES-256-GCM encryption for all third-party integrations (GitHub, Stripe).

## 📊 Performance Benchmarks

| Metric | E-Code | Industry Avg. |
| :--- | :--- | :--- |
| **Workspace Cold Start** | < 15s | 120s+ |
| **API Response (P95)** | 12ms | 150ms |
| **Hot Reload Latency** | < 100ms | 2.5s |
| **Concurrent Sessions** | 10,000+ | 500 |

## 🤝 Contributing & Support

We welcome contributions from the community. Please review our [Contributing Guide](CONTRIBUTING.md) for standards and workflow.

*   **Support:** [support@e-code.ai](mailto:support@e-code.ai)
*   **Documentation:** [https://docs.e-code.ai](https://docs.e-code.ai)
*   **Status:** [https://status.e-code.ai](https://status.e-code.ai)

---

<div align="center">
  <p>Built with ❤️ by the E-Code Engineering Team</p>
  <p>
    <a href="https://e-code.ai">Website</a> •
    <a href="https://blog.e-code.ai">Blog</a> •
    <a href="https://twitter.com/ecodeai">Twitter</a> •
    <a href="https://linkedin.com/company/e-code-ai">LinkedIn</a>
  </p>
</div>

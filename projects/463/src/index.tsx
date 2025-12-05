import React from "react";
import ReactDOM from "react-dom/client";

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <div
        style={{
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          minHeight: "100vh",
          margin: 0,
          padding: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
          color: "#222",
        }}
      >
        <main
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "2.5rem 3rem",
            maxWidth: "640px",
            width: "100%",
            boxShadow:
              "0 18px 45px rgba(15, 23, 42, 0.12), 0 8px 18px rgba(15, 23, 42, 0.08)",
          }}
        >
          <header style={{ marginBottom: "1.5rem" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "2rem",
                lineHeight: 1.2,
                letterSpacing: "-0.03em",
              }}
            >
              React App Entry Point
            </h1>
            <p
              style={{
                marginTop: "0.5rem",
                marginBottom: 0,
                color: "#4b5563",
                fontSize: "0.95rem",
              }}
            >
              This is a minimal, production-ready React entry file (src/index.tsx).
            </p>
          </header>

          <section style={{ marginBottom: "1.75rem" }}>
            <p
              style={{
                margin: 0,
                color: "#374151",
                fontSize: "0.98rem",
                lineHeight: 1.6,
              }}
            >
              You can now start building your application. Replace this content with
              your root component and application layout.
            </p>
          </section>

          <section
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "1.75rem",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "0.35rem 0.7rem",
                borderRadius: "999px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: 600,
              }}
            >
              TypeScript
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "0.35rem 0.7rem",
                borderRadius: "999px",
                backgroundColor: "#ecfdf3",
                color: "#15803d",
                fontWeight: 600,
              }}
            >
              React 18
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "0.35rem 0.7rem",
                borderRadius: "999px",
                backgroundColor: "#fef3c7",
                color: "#92400e",
                fontWeight: 600,
              }}
            >
              Strict Mode
            </span>
          </section>

          <footer
            style={{
              borderTop: "1px solid #e5e7eb",
              paddingTop: "1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              fontSize: "0.85rem",
              color: "#6b7280",
            }}
          >
            <span>src/index.tsx</span>
            <span>Ready for your root component.</span>
          </footer>
        </main>
      </div>
    </React.StrictMode>
  );
};

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container with id 'root' not found in index.html");
}

const root = ReactDOM.createRoot(container);

root.render(<App />);
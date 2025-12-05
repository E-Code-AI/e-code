import React from "react";
import ReactDOM from "react-dom/client";

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <div style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "2rem" }}>
        <h1>React App</h1>
        <p>Application entry point is configured and running.</p>
      </div>
    </React.StrictMode>
  );
};

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container with id 'root' not found in the document.");
}

const root = ReactDOM.createRoot(container);

root.render(<App />);
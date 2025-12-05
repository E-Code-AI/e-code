import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container with id 'root' not found in the document.");
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
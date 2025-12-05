import React from "react";
import ReactDOM from "react-dom/client";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element with id 'root' not found in the document.");
}

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <div>
        <h1>React App Entry Point</h1>
        <p>Your application is now running.</p>
      </div>
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(rootElement);

root.render(<App />);
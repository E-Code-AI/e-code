// @ts-nocheck
// Minimal server with routes import

import express from "express";


const app = express();

// Try to start server
const port = 5000;
app.listen(port, "0.0.0.0", () => {
  // Server started
});

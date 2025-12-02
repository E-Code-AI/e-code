# Counter App

A simple, production-ready counter application demonstrating a modern frontend development setup. The app lets you increment, decrement, and reset a numeric counter, and serves as a minimal example of a clean project structure, predictable state updates, and a standard build pipeline.

---

## Tech Stack

- Framework: React (with functional components and hooks)
- Language: TypeScript
- Bundler/Dev Server: Vite
- Styling: CSS Modules (or simple global CSS, depending on the project setup)
- Package Manager: npm (you can also use pnpm or yarn if preferred)

---

## Prerequisites

- Node.js (LTS recommended, e.g., 18+)
- npm (comes with Node.js)

You can verify your versions with:

- node -v
- npm -v

---

## Getting Started

1. Clone the repository:

   git clone https://github.com/your-username/counter-app.git
   cd counter-app

2. Install dependencies:

   npm install

---

## Development

To start the development server with hot module replacement:

npm run dev

Then open your browser and navigate to:

http://localhost:5173

(Port may differ if 5173 is already in use; check the terminal output.)

---

## Building for Production

To create an optimized production build:

npm run build

This command will:

- Compile TypeScript
- Bundle and minify JavaScript and CSS
- Output static assets to the dist directory

---

## Previewing the Production Build

To locally preview the production build (using Vite’s preview server):

1. Build the app (if you haven’t already):

   npm run build

2. Start the preview server:

   npm run preview

Then open the URL shown in the terminal (typically http://localhost:4173).

---

## Serving the Built App

The dist directory contains static files that can be served by any static file server or hosting provider (e.g., Nginx, Apache, Netlify, Vercel, GitHub Pages, S3 + CloudFront).

Common options:

- Use a simple static server locally (example):

  npx serve dist

- Deploy the dist folder contents to your hosting provider of choice.

Refer to your hosting provider’s documentation for details on uploading and configuring static sites.

---

## Basic Usage

Once the app is running (in dev, preview, or production):

1. Open the app in your browser.
2. You will see:
   - The current counter value (starting at 0 by default).
   - Buttons to:
     - Increment the counter
     - Decrement the counter
     - Reset the counter to its initial value
3. Click the buttons to update the counter and see the value change immediately.

---

## Available Scripts

In the project directory, you can run:

- npm run dev  
  Starts the development server with hot reloading.

- npm run build  
  Builds the app for production into the dist folder.

- npm run preview  
  Serves the production build locally for testing.

- npm run lint (if configured)  
  Runs the linter to check for code quality and style issues.

---

## Project Structure (Typical)

A common structure for this counter app might look like:

- src/
  - main.tsx          Entry point that mounts the React app
  - App.tsx           Root component containing the counter UI
  - components/
    - Counter.tsx     Counter component with increment/decrement/reset logic
  - styles/
    - app.css         Global styles or CSS modules
- index.html          HTML template
- tsconfig.json       TypeScript configuration
- vite.config.ts      Vite configuration
- package.json        Scripts and dependencies

(Your actual structure may vary slightly, but the above is a typical layout.)

---

## Customization

You can easily extend this counter app by:

- Adding more buttons (e.g., increment by 5, decrement by 10).
- Persisting the counter value in localStorage.
- Adding tests (e.g., with Vitest, Jest, or React Testing Library).
- Styling the UI with a design system or component library.

---

## Troubleshooting

- If npm install fails:
  - Ensure you are using a supported Node.js version.
  - Delete node_modules and package-lock.json, then run npm install again.

- If npm run dev does not start:
  - Check for port conflicts.
  - Ensure dependencies installed correctly.
  - Review the terminal output for specific error messages.

---

## License

This project is provided under the MIT License (or your chosen license). See the LICENSE file for details.
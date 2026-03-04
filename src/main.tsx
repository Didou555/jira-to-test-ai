import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

const root = createRoot(rootElement);

import("./App.tsx")
  .then(({ default: App }) => {
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  })
  .catch((error) => {
    console.error("Bootstrap error:", error);
    root.render(
      <div className="min-h-screen bg-background text-foreground p-6">
        <h1 className="text-xl font-semibold">Application failed to start</h1>
        <pre className="mt-4 whitespace-pre-wrap break-words text-sm">{String(error?.stack || error?.message || error)}</pre>
      </div>
    );
  });

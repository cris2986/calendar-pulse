import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";
import "./types/global.d.ts";

// Boot diagnostic
const boot = document.getElementById("__boot");
if (boot) boot.textContent += "MAIN TSX LOADED\n";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

// Initialize Convex client with error handling
let convex: ConvexReactClient | null = null;
try {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  if (convexUrl && convexUrl !== "undefined") {
    convex = new ConvexReactClient(convexUrl);
  }
} catch (error) {
  console.warn("Convex initialization failed, continuing without it:", error);
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

// App component with layered mounting
function App() {
  return (
    <BrowserRouter>
      <RouteSyncer />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<AuthPage redirectAfterAuth="/" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// Render with error boundary and optional Convex
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <VlyToolbar />
      <InstrumentationProvider>
        {convex ? (
          <ConvexAuthProvider client={convex}>
            <App />
            <Toaster />
          </ConvexAuthProvider>
        ) : (
          <>
            <App />
            <Toaster />
          </>
        )}
      </InstrumentationProvider>
    </ErrorBoundary>
  </StrictMode>,
);

if (boot) boot.textContent += "REACT RENDER CALLED\n";
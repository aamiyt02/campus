"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "Server configuration error. Please contact support.",
    AccessDenied: "Access denied. You may not have permission to sign in.",
    Verification: "Verification link expired or already used.",
    Default: "An authentication error occurred. Please try again.",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{ padding: 48, textAlign: "center", maxWidth: 420, width: "90%" }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(239,68,68,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <AlertTriangle size={26} color="var(--danger)" />
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>
          Authentication Error
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            marginBottom: 32,
          }}
        >
          {errorMessages[error || ""] || errorMessages.Default}
        </p>

        <Link
          href="/"
          className="btn-primary"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            padding: "12px 28px",
          }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-primary)",
          }}
        >
          <div className="loading-skeleton" style={{ width: 200, height: 24 }} />
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}

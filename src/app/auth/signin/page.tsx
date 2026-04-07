"use client";

import { signIn } from "next-auth/react";
import { Mail, Zap } from "lucide-react";

export default function SignInPage() {
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
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "40vw",
          height: "40vh",
          background:
            "radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="glass-card animate-fade-in"
        style={{
          padding: 48,
          textAlign: "center",
          maxWidth: 420,
          width: "90%",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, var(--accent), #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <Zap size={26} color="white" />
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>
          Welcome to CampusExtract
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          Sign in with your Google account to start extracting campus events from
          your inbox.
        </p>

        <button
          className="btn-primary"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          id="signin-btn"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "14px 24px",
            fontSize: "0.9375rem",
          }}
        >
          <Mail size={18} />
          Continue with Google
        </button>

        <p
          style={{
            marginTop: 20,
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          We only request read-only access to your Gmail.
          <br />
          No emails are modified or deleted.
        </p>
      </div>
    </div>
  );
}

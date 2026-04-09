"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Mail,
  Zap,
  Calendar,
  Shield,
  ArrowRight,
  Sparkles,
  Filter,
  BookmarkCheck,
} from "lucide-react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  if (loading) {
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
        <div className="loading-skeleton" style={{ width: 48, height: 48, borderRadius: "50%" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Ambient background glow */}
      <div
        style={{
          position: "fixed",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80vw",
          height: "60vh",
          background:
            "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Nav */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          padding: "20px 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          className="page-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, var(--accent), #4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={18} color="white" />
            </div>
            <span style={{ fontSize: "1.125rem", fontWeight: 700 }}>
              Campus<span style={{ color: "var(--accent-light)" }}>Extract</span>
            </span>
          </div>
          <button
            className="btn-primary"
            onClick={() => router.push("/auth/signin")}
            id="signin-btn-nav"
          >
            <Mail size={16} />
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="page-container animate-fade-in"
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          paddingTop: 100,
          paddingBottom: 80,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent-glow)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 20,
            padding: "6px 16px",
            marginBottom: 28,
            fontSize: "0.8125rem",
            color: "var(--accent-light)",
            fontWeight: 500,
          }}
        >
          <Sparkles size={14} />
          Free for all campus students
        </div>

        <h1
          style={{
            fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}
        >
          Never miss a campus
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, var(--accent-light), #a78bfa, var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            event again
          </span>
        </h1>

        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--text-secondary)",
            maxWidth: 560,
            margin: "0 auto 40px",
            lineHeight: 1.6,
          }}
        >
          CampusExtract scans your emails and automatically extracts workshops,
          fests, placements, deadlines, and more — organized in one beautiful
          dashboard.
        </p>

        <button
          className="btn-primary"
          onClick={() => router.push("/auth/signin")}
          id="signin-btn-hero"
          style={{ padding: "14px 32px", fontSize: "1rem", borderRadius: 14 }}
        >
          <Mail size={18} />
          Get Started
          <ArrowRight size={16} />
        </button>

        <p
          style={{
            marginTop: 16,
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
          }}
        >
          Read-only access · No data shared · Works with any .edu email
        </p>
      </section>

      {/* Features */}
      <section
        className="page-container"
        style={{
          position: "relative",
          zIndex: 10,
          paddingBottom: 100,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              icon: <Mail size={22} />,
              title: "Smart Email Scanning",
              desc: "Automatically reads your inbox and identifies event-related emails using intelligent keyword matching.",
              color: "var(--accent)",
            },
            {
              icon: <Zap size={22} />,
              title: "Instant Extraction",
              desc: "Pulls out dates, times, venues, registration links, and deadlines from messy email formats.",
              color: "var(--cat-cultural)",
            },
            {
              icon: <Filter size={22} />,
              title: "Smart Categories",
              desc: "Auto-classifies events into Academic, Cultural, Career, Sports, and Clubs — filter in one click.",
              color: "var(--cat-career)",
            },
            {
              icon: <Calendar size={22} />,
              title: "Deadline Alerts",
              desc: "Never miss a registration deadline. Events with upcoming deadlines are highlighted automatically.",
              color: "var(--warning)",
            },
            {
              icon: <BookmarkCheck size={22} />,
              title: "Bookmark & Organize",
              desc: "Save events you care about and dismiss the rest. Your dashboard, your way.",
              color: "var(--success)",
            },
            {
              icon: <Shield size={22} />,
              title: "100% Privacy",
              desc: "Read-only Gmail access. Your data stays in your account. Nothing is shared or stored externally.",
              color: "var(--info)",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="glass-card animate-slide-up"
              style={{
                padding: 28,
                animationDelay: `${i * 0.08}s`,
                animationFillMode: "both",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${f.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: f.color,
                  marginBottom: 16,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 8 }}>
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px 0",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.8125rem",
        }}
      >
        <div className="page-container">
          Built for campus communities · Free forever · Open source
        </div>
      </footer>
    </div>
  );
}

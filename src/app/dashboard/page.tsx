"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Search,
  LogOut,
  Zap,
  SlidersHorizontal,
  Inbox,
  ArrowUpDown,
  Bookmark,
} from "lucide-react";
import EventCard from "@/components/EventCard";
import StatsBar from "@/components/StatsBar";

interface Event {
  id: string;
  title: string;
  description: string | null;
  category: string;
  eventDate: string | null;
  eventEndDate: string | null;
  eventTime: string | null;
  location: string | null;
  registrationUrl: string | null;
  deadline: string | null;
  deadlineText: string | null;
  senderName: string | null;
  senderEmail: string | null;
  confidence: number;
  isBookmarked: boolean;
  isDismissed: boolean;
  isRead: boolean;
  extractedAt: string;
}

interface StatsData {
  totalEvents: number;
  upcomingEvents: number;
  bookmarkedCount: number;
  categories: Record<string, number>;
  lastSync: any;
}

const CATEGORIES = [
  { value: "all", label: "All Events" },
  { value: "academic", label: "Academic" },
  { value: "cultural", label: "Cultural" },
  { value: "career", label: "Career" },
  { value: "sports", label: "Sports" },
  { value: "clubs", label: "Clubs" },
  { value: "deadline", label: "Deadlines" },
  { value: "general", label: "General" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "date", label: "Event Date" },
  { value: "confidence", label: "Confidence" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("newest");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category,
        sort,
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (bookmarkedOnly) params.set("bookmarked", "true");

      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();

      if (res.ok) {
        setEvents(data.events || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, [category, sort, search, bookmarkedOnly, page]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchEvents();
      fetchStats();
    }
  }, [session, fetchEvents, fetchStats]);

  // Sync emails
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setSyncResult(
          `Scanned ${data.emailsFound} emails, found ${data.eventsFound} new events`
        );
        fetchEvents();
        fetchStats();
      } else {
        setSyncResult(`Sync error: ${data.error}`);
      }
    } catch (err) {
      setSyncResult("Failed to sync. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  if (status === "loading") {
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
        <RefreshCw
          size={32}
          style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(10, 10, 15, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="page-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, var(--accent), #4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={16} color="white" />
            </div>
            <span style={{ fontSize: "1rem", fontWeight: 700 }}>
              Campus
              <span style={{ color: "var(--accent-light)" }}>Extract</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn-primary"
              onClick={handleSync}
              disabled={syncing}
              id="sync-btn"
              style={{ fontSize: "0.8125rem", padding: "8px 16px" }}
            >
              <RefreshCw
                size={14}
                style={syncing ? { animation: "spin 1s linear infinite" } : {}}
              />
              {syncing ? "Syncing..." : "Sync Emails"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt=""
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "2px solid var(--border)",
                  }}
                />
              )}
              <button
                className="btn-ghost"
                onClick={() => signOut({ callbackUrl: "/" })}
                id="signout-btn"
                style={{ padding: "6px 12px" }}
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <main className="page-container" style={{ paddingTop: 28, paddingBottom: 60 }}>
        {/* Sync Result */}
        {syncResult && (
          <div
            className="animate-fade-in"
            style={{
              background: syncResult.includes("error")
                ? "rgba(239,68,68,0.1)"
                : "rgba(34,197,94,0.1)",
              border: `1px solid ${
                syncResult.includes("error")
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(34,197,94,0.2)"
              }`,
              borderRadius: 12,
              padding: "12px 20px",
              marginBottom: 20,
              fontSize: "0.8125rem",
              color: syncResult.includes("error")
                ? "var(--danger)"
                : "var(--success)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{syncResult}</span>
            <button
              onClick={() => setSyncResult(null)}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats */}
        <StatsBar stats={stats} loading={statsLoading} />

        {/* Filters */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              className="input"
              placeholder="Search events..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              id="search-input"
              style={{ paddingLeft: 40 }}
            />
          </div>

          {/* Category filters */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <SlidersHorizontal size={14} style={{ color: "var(--text-muted)" }} />
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`btn-ghost ${category === cat.value ? "active" : ""}`}
                onClick={() => {
                  setCategory(cat.value);
                  setPage(1);
                }}
                style={{ padding: "6px 12px", fontSize: "0.75rem" }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort & Bookmark filter */}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button
              className={`btn-ghost ${bookmarkedOnly ? "active" : ""}`}
              onClick={() => {
                setBookmarkedOnly(!bookmarkedOnly);
                setPage(1);
              }}
              style={{ padding: "6px 12px" }}
            >
              <Bookmark size={13} />
              Saved
            </button>
            <div style={{ position: "relative" }}>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                id="sort-select"
                style={{
                  appearance: "none",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "6px 32px 6px 12px",
                  color: "var(--text-secondary)",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ArrowUpDown
                size={12}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 16,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="loading-skeleton"
                style={{ height: 220, borderRadius: 16 }}
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div
            className="glass-card animate-fade-in"
            style={{
              padding: 60,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "var(--accent-glow)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Inbox size={28} color="var(--accent)" />
            </div>
            <h3

              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              No events found
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                marginBottom: 24,
                maxWidth: 400,
                margin: "0 auto 24px",
              }}
            >
              {stats?.totalEvents === 0
                ? 'Click "Sync Emails" to scan your inbox for campus events.'
                : "Try adjusting your filters or search query."}
            </p>
            {stats?.totalEvents === 0 && (
              <button
                className="btn-primary"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw size={16} />
                Sync Emails Now
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 16,
              }}
            >
              {events.map((event, i) => (
                <div
                  key={event.id}
                  className="animate-slide-up"
                  style={{
                    animationDelay: `${i * 0.04}s`,
                    animationFillMode: "both",
                  }}
                >
                  <EventCard event={event} onUpdate={fetchEvents} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 32,
                }}
              >
                <button
                  className="btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                    padding: "0 12px",
                  }}
                >
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn-ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

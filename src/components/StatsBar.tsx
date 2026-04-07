"use client";

import { Calendar, Bookmark, TrendingUp, Mail } from "lucide-react";

interface StatsData {
  totalEvents: number;
  upcomingEvents: number;
  bookmarkedCount: number;
  categories: Record<string, number>;
  lastSync: {
    status: string;
    emailsFound: number;
    eventsFound: number;
    startedAt: string;
    completedAt: string | null;
  } | null;
}

interface StatsBarProps {
  stats: StatsData | null;
  loading: boolean;
}

export default function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading || !stats) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="loading-skeleton"
            style={{ height: 88, borderRadius: 16 }}
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: <Mail size={20} />,
      label: "Total Events",
      value: stats.totalEvents,
      color: "var(--accent)",
      bg: "rgba(99,102,241,0.1)",
    },
    {
      icon: <Calendar size={20} />,
      label: "Upcoming",
      value: stats.upcomingEvents,
      color: "var(--success)",
      bg: "rgba(34,197,94,0.1)",
    },
    {
      icon: <Bookmark size={20} />,
      label: "Bookmarked",
      value: stats.bookmarkedCount,
      color: "var(--warning)",
      bg: "rgba(245,158,11,0.1)",
    },
    {
      icon: <TrendingUp size={20} />,
      label: "Categories",
      value: Object.keys(stats.categories).length,
      color: "var(--cat-cultural)",
      bg: "rgba(236,72,153,0.1)",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16,
        marginBottom: 28,
      }}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          className="glass-card animate-slide-up"
          style={{
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            animationDelay: `${i * 0.05}s`,
            animationFillMode: "both",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: card.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: card.color,
              flexShrink: 0,
            }}
          >
            {card.icon}
          </div>
          <div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontWeight: 500,
              }}
            >
              {card.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import {
  Bookmark,
  BookmarkCheck,
  X,
  ExternalLink,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  User,
} from "lucide-react";

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

interface EventCardProps {
  event: Event;
  onUpdate: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  academic: { label: "Academic", className: "badge-academic" },
  cultural: { label: "Cultural", className: "badge-cultural" },
  career: { label: "Career", className: "badge-career" },
  sports: { label: "Sports", className: "badge-sports" },
  clubs: { label: "Clubs", className: "badge-clubs" },
  deadline: { label: "Deadline", className: "badge-deadline" },
  general: { label: "General", className: "badge-general" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date unknown";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Date unknown";
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return "var(--success)";
  if (confidence >= 0.4) return "var(--warning)";
  return "var(--danger)";
}

function isDeadlineSoon(deadline: string | null): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // 3 days
}

export default function EventCard({ event, onUpdate }: EventCardProps) {
  const [loading, setLoading] = useState(false);

  const updateEvent = useCallback(
    async (data: Partial<Event>) => {
      setLoading(true);
      try {
        await fetch(`/api/events/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        onUpdate();
      } catch (err) {
        console.error("Failed to update event:", err);
      } finally {
        setLoading(false);
      }
    },
    [event.id, onUpdate]
  );

  const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.general;
  const deadlineSoon = isDeadlineSoon(event.deadline);

  return (
    <div
      className="glass-card"
      style={{
        padding: 24,
        opacity: loading ? 0.6 : 1,
        transition: "opacity 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Deadline warning stripe */}
      {deadlineSoon && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, var(--danger), var(--warning))",
          }}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <span className={`badge ${cat.className}`}>{cat.label}</span>
            {deadlineSoon && (
              <span
                className="badge badge-deadline"
                style={{ display: "flex", alignItems: "center", gap: 3 }}
              >
                <AlertCircle size={10} />
                Deadline soon
              </span>
            )}
          </div>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {event.title}
          </h3>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => updateEvent({ isBookmarked: !event.isBookmarked })}
            className="tooltip-wrapper"
            data-tooltip={event.isBookmarked ? "Remove bookmark" : "Bookmark"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: event.isBookmarked
                ? "var(--warning)"
                : "var(--text-muted)",
              transition: "all 0.2s",
            }}
            disabled={loading}
          >
            {event.isBookmarked ? (
              <BookmarkCheck size={18} />
            ) : (
              <Bookmark size={18} />
            )}
          </button>
          <button
            onClick={() => updateEvent({ isDismissed: true })}
            className="tooltip-wrapper"
            data-tooltip="Dismiss"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: "var(--text-muted)",
              transition: "all 0.2s",
            }}
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: 14,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {event.description}
        </p>
      )}

      {/* Meta */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 16px",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginBottom: 14,
        }}
      >
        {event.eventDate && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={12} /> {formatDate(event.eventDate)}
          </span>
        )}
        {event.eventTime && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={12} /> {event.eventTime}
          </span>
        )}
        {event.location && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={12} /> {event.location}
          </span>
        )}
        {event.senderName && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <User size={12} /> {event.senderName}
          </span>
        )}
      </div>

      {/* Deadline */}
      {event.deadline && (
        <div
          style={{
            fontSize: "0.75rem",
            color: deadlineSoon ? "var(--danger)" : "var(--text-muted)",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <AlertCircle size={12} />
          Deadline: {formatDate(event.deadline)}
          {event.deadlineText && ` — ${event.deadlineText}`}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 12,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Confidence
            </span>
            <div className="confidence-bar" style={{ width: 60 }}>
              <div
                className="confidence-fill"
                style={{
                  width: `${event.confidence * 100}%`,
                  background: getConfidenceColor(event.confidence),
                }}
              />
            </div>
          </div>
          <span
            style={{
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
            }}
          >
            {timeAgo(event.extractedAt)}
          </span>
        </div>

        {event.registrationUrl && (
          <a
            href={event.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              padding: "6px 14px",
              fontSize: "0.75rem",
              textDecoration: "none",
            }}
          >
            Register
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

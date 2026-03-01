"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getNotificationsAction,
  markReadAction,
} from "@/app/actions/notifications";

interface Notification {
  id: string;
  type: string;
  summary: string;
  project_id: string | null;
  event_id: string | null;
  read: boolean;
  created_at: Date;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await getNotificationsAction();
      setNotifications(result.notifications as Notification[]);
      setCount(result.count);
    } catch {
      // Ignore errors (user might not be authenticated yet)
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleClick = async (notif: Notification) => {
    await markReadAction(notif.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setCount((prev) => Math.max(0, prev - 1));
    setOpen(false);

    if (notif.project_id) {
      router.push(`/projects/${notif.project_id}`);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-100 font-medium text-gray-900 text-sm">
            Notifieringar
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              Inga nya notifieringar
            </div>
          ) : (
            <ul>
              {notifications.map((notif) => (
                <li key={notif.id}>
                  <button
                    onClick={() => handleClick(notif)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs mt-0.5">
                        {notif.type === "time_reported" && "⏱"}
                        {notif.type === "photo_added" && "📷"}
                        {notif.type === "status_change" && "🔄"}
                        {notif.type === "correction" && "✏️"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {notif.summary}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatTimeAgo(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just nu";
  if (diffMin < 60) return `${diffMin}m sedan`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h sedan`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d sedan`;
}

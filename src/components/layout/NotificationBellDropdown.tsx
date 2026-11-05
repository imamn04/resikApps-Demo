"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  ShieldCheck,
  Truck,
  CheckCheck,
  ExternalLink,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "DISPATCH" | "APPROVAL" | "VALIDATION" | "FINISHED" | "POOL" | "INFO";
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

function playNotificationChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio autoplay restrictions gracefully
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSecs < 10) return "Baru saja";
    if (diffInSecs < 60) return `${diffInSecs} dtk lalu`;
    if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)} mnt lalu`;
    if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)} jam lalu`;
    if (diffInSecs < 604800) return `${Math.floor(diffInSecs / 86400)} hari lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export default function NotificationBellDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number>(0);
  const hasInitializedRef = useRef<boolean>(false);

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const items: NotificationItem[] = data.notifications || [];
        const count: number = data.unreadCount || 0;

        // If unread count increased after initial load, play sound chime
        if (hasInitializedRef.current && count > prevUnreadRef.current) {
          playNotificationChime();
        }

        prevUnreadRef.current = count;
        hasInitializedRef.current = true;
        setNotifications(items);
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Polling every 15 seconds for real-time responsiveness
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;

      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    // If unread, mark it as read immediately
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);

      fetch(`/api/notifications/${notif.id}`, { method: "PATCH" }).catch(() => {});
    }

    setIsOpen(false);

    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    }
  };

  const renderIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "DISPATCH":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
        );
      case "APPROVAL":
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case "VALIDATION":
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        );
      case "FINISHED":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "POOL":
        return (
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(true);
        }}
        className={`relative p-2 rounded-xl transition-all duration-200 border ${
          isOpen
            ? "bg-amber-50 text-amber-600 border-amber-200 shadow-sm"
            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-navy-900"
        }`}
        title="Notifikasi"
        aria-label="Buka notifikasi"
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:absolute sm:w-96 sm:max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#111C44] to-[#1E293B] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-sm">Notifikasi</span>
              {unreadCount > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} baru
                </span>
              ) : (
                <span className="bg-white/20 text-slate-200 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  Semua terbaca
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 font-medium transition-colors"
                title="Tandai semua telah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Baca Semua</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent mb-2" />
                <p>Memuat notifikasi...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Belum ada notifikasi</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aktivitas pekerjaan baru dan pembaruan status akan muncul di sini.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    item.isRead
                      ? "bg-white hover:bg-slate-50"
                      : "bg-amber-50/40 hover:bg-amber-50/70"
                  }`}
                >
                  {renderIcon(item.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs truncate ${
                          item.isRead
                            ? "font-semibold text-slate-700"
                            : "font-bold text-navy-900"
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                      {item.message}
                    </p>

                    {item.linkUrl && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700">
                        <span>Lihat Detail</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {!item.isRead && (
                    <span
                      className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5 shadow-sm"
                      title="Belum dibaca"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Resik Purwokerto Management System</span>
            <button
              type="button"
              onClick={() => fetchNotifications(false)}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Segarkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

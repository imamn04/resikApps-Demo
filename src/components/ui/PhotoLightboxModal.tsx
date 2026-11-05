"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Calendar, User, Tag, Download } from "lucide-react";
import { JobPhotoData } from "@/types";
import { formatDateID } from "@/lib/utils";

interface PhotoLightboxModalProps {
  photos: JobPhotoData[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function PhotoLightboxModal({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
}: PhotoLightboxModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
      if (e.key === "ArrowRight" && currentIndex < photos.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onClose]);

  if (!mounted || !isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  const typeConfig: Record<string, { label: string; bg: string; text: string }> = {
    CHECKIN: { label: "Check-in & APD", bg: "bg-blue-500", text: "text-white" },
    BEFORE: { label: "Before (Kondisi Awal)", bg: "bg-amber-500", text: "text-[#111C44]" },
    AFTER: { label: "After (Hasil Bersih)", bg: "bg-emerald-500", text: "text-white" },
  };

  const badge = typeConfig[currentPhoto.photoType] || {
    label: currentPhoto.photoType,
    bg: "bg-slate-700",
    text: "text-white",
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-[#0B1437]/90 backdrop-blur-md flex flex-col justify-between animate-fade-in">
      {/* Top Header Bar */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 bg-[#111C44]/80 border-b border-white/10 text-white">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          <span className="text-xs text-slate-300 font-medium">
            Foto {currentIndex + 1} dari {photos.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={currentPhoto.filePath}
            download={currentPhoto.fileName || "foto-evidence.jpg"}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Unduh / Buka Asli"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white transition-colors"
            title="Tutup (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image View Area */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden select-none">
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-sm transition-all"
            title="Sebelumnya"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-sm transition-all"
            title="Selanjutnya"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* The Photo */}
        <div className="max-w-full max-h-full flex items-center justify-center">
          <img
            src={currentPhoto.filePath}
            alt={currentPhoto.caption || "Foto Dokumentasi ICRM"}
            className="max-h-[75vh] max-w-[90vw] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
          />
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="shrink-0 px-4 sm:px-6 py-4 bg-[#111C44]/80 border-t border-white/10 text-white">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-white text-sm">
              {currentPhoto.caption || "Tidak ada keterangan tambahan"}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-slate-300 mt-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Diunggah oleh: {currentPhoto.uploadedBy?.name || "Teknisi"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                {formatDateID(currentPhoto.createdAt)}
              </span>
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
            {photos.map((p, idx) => (
              <button
                key={p.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  idx === currentIndex
                    ? "border-amber-400 ring-2 ring-amber-400/50 scale-105"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={p.filePath}
                  alt={`Thumb ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


import React from "react";
import { JobStatus } from "@/types";
import { JOB_STATUS_CONFIG } from "@/lib/utils";

interface StatusBadgeProps {
  status: JobStatus | string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const config = JOB_STATUS_CONFIG[status] || {
    label: status.replace(/_/g, " "),
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-500",
    stepNumber: 0,
  };

  const isPulse =
    status === "DALAM_PENGERJAAN" ||
    status === "MENUJU_LOKASI" ||
    status === "TIBA_DI_LOKASI" ||
    status === "MENUNGGU_VALIDASI";

  const sizeClasses =
    size === "sm"
      ? "text-[10px] px-2 py-0.5 gap-1.5"
      : "text-xs px-2.5 py-1 gap-2";

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border shadow-2xs transition-all tracking-wide ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className="relative flex h-2 w-2">
        {isPulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`}
        />
      </span>
      <span>{config.label}</span>
    </span>
  );
};

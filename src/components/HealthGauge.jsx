import React from "react";

export default function HealthGauge({ score = 0, size = 140, label = "Santé" }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 75 ? "#16a34a" : clamped >= 50 ? "#ca8a04" : clamped >= 30 ? "#ea580c" : "#dc2626";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight" style={{ color }}>
            {Math.round(clamped)}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      {label && <span className="mt-2 text-sm font-medium text-muted-foreground">{label}</span>}
    </div>
  );
}
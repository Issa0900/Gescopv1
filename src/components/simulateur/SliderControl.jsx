import React from "react";
import { cn } from "@/lib/utils";

export default function SliderControl({
  label,
  value,
  onChange,
  min = -20,
  max = 20,
  neutral = 0,
  hint,
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className={cn(
          "text-sm font-bold",
          value > neutral ? "text-emerald-600" : value < neutral ? "text-red-600" : "text-muted-foreground",
        )}>
          {value > 0 && neutral === 0 ? "+" : ""}{value}%
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{min}%</span><span>{Math.round((min + max) / 2)}%</span><span>{max > 0 ? "+" : ""}{max}%</span>
      </div>
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}
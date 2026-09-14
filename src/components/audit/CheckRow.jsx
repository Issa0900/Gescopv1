import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";

const config = {
  ok: { Icon: CheckCircle2, cls: "text-emerald-600", bg: "bg-emerald-50" },
  warn: { Icon: AlertTriangle, cls: "text-amber-600", bg: "bg-amber-50" },
  error: { Icon: XCircle, cls: "text-red-600", bg: "bg-red-50" },
  skip: { Icon: MinusCircle, cls: "text-muted-foreground", bg: "bg-muted" },
};

export default function CheckRow({ check }) {
  const { Icon, cls, bg } = config[check.status] || config.skip;
  return (
    <div className="flex gap-3 border-b border-border py-3 last:border-0">
      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${bg}`}>
        <Icon className={`h-4 w-4 ${cls}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{check.label}</p>
        {check.detail && <p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p>}
        {(check.expected || check.actual) && (
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
            {check.expected && <span className="text-muted-foreground">{check.expected}</span>}
            {check.actual && <span className="text-muted-foreground">{check.actual}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
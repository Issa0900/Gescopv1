import React from "react";

export default function MetricTrace({ trace }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{trace.metric}</h3>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{trace.domain}</span>
      </div>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">Formule</dt>
          <dd className="font-medium">{trace.formula}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">Source</dt>
          <dd>{trace.source}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">Période</dt>
          <dd>{trace.period}</dd>
        </div>
      </dl>
      <div className="mt-3 space-y-1 rounded-lg bg-muted/40 p-3">
        {trace.steps.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </div>
      {trace.note && <p className="mt-2 text-xs italic text-muted-foreground">{trace.note}</p>}
    </div>
  );
}
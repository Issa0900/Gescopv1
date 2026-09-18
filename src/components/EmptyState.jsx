import React from "react";

/**
 * @param {Object} props
 * @param {React.ComponentType<{className?: string}>} [props.icon]
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action]
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
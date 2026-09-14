import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Case de consentement Loi 25, partagee par Register et PrivacyConsentModal.
// role/aria-checked sont indispensables : sans eux un lecteur d'ecran annonce
// un simple bouton et l'utilisateur ne sait pas si son consentement est coche.
export default function ConsentCheckbox({ id = "consent", checked, onChange, children }) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary/50"
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <span id={`${id}-label`} className="text-xs leading-relaxed text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

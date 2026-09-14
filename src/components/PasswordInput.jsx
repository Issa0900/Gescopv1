import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff } from "lucide-react";

// Champ mot de passe avec bascule d'affichage. Partage entre Login, Register
// et ResetPassword : une saisie masquee non verifiable est la premiere cause
// d'echec de connexion au clavier tactile.
export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "current-password",
  autoFocus = false,
  placeholder = "••••••••",
  required = true,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="pl-10 pr-12 h-12"
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

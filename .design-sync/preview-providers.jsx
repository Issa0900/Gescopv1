// Contexte requis par les apercus, expose comme export du bundle pour que
// cfg.provider puisse le nommer (le convertisseur refuse un provider absent
// de la liste d'exports).
//
// MemoryRouter : de nombreux composants (InsightCard, RiskCard, Sidebar...)
// utilisent Link / useLocation de react-router et rendent vide hors routeur.
// TooltipProvider : Radix exige ce provider des qu'un Tooltip est monte.
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

export function PreviewProviders({ children }) {
  return (
    <MemoryRouter>
      <TooltipProvider>{children}</TooltipProvider>
    </MemoryRouter>
  );
}

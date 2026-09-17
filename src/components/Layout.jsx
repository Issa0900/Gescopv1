import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

export default function Layout() {
  const location = useLocation();
  const [compact, setCompact] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar compact={compact} onToggleCompact={() => setCompact((c) => !c)} />
      <main className={cn("transition-all duration-300", compact ? "md:pl-16" : "md:pl-64")}>
        {/* pt-20 sur mobile : le bouton de menu est en position fixe (Sidebar
              left-4 top-4, 40px) et recouvrait le titre de chaque page. */}
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-20 md:px-8 md:py-10">
          {/* CSS-only fade (pas de framer-motion) : AnimatePresence + Suspense/lazy
              autour de l'Outlet provoquait un crash React ("Failed to execute
              'removeChild'") quand l'animation de sortie manipulait encore le
              noeud DOM au moment ou React le retirait pendant un changement de route. */}
          <div key={location.pathname} className="animate-in fade-in duration-200">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

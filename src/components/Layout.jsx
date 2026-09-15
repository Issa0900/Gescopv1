import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

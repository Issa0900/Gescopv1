import React from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardHeader({ greeting, date, lastAnalysis, onAnalyze, analyzing, hasData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"
    >
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">{greeting}</h1>
          {lastAnalysis && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-[#10B981]"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              Dernière analyse : {lastAnalysis}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{date}</p>
      </div>
      <motion.button
        onClick={onAnalyze}
        disabled={analyzing || !hasData}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-shadow duration-150 hover:shadow-lg hover:shadow-emerald-500/25 disabled:pointer-events-none disabled:opacity-50"
      >
        <RefreshCw className={cn("mr-2 h-4 w-4", analyzing && "animate-spin")} />
        {analyzing ? "Analyse en cours…" : "Actualiser l'analyse"}
      </motion.button>
    </motion.div>
  );
}
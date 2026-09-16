import React from "react";
import { motion } from "@/lib/fake-framer-motion.jsx";
import { Sparkles } from "lucide-react";

export default function AnalysisEmptyState({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
      className="mx-auto max-w-2xl rounded-3xl border border-white/60 bg-white/70 p-10 text-center shadow-[0_8px_40px_-12px_rgba(16,24,40,0.12)] backdrop-blur-xl md:p-14"
    >
      <motion.div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10B981]/10"
        animate={{
          scale: [1, 1.05, 1],
          filter: [
            "drop-shadow(0 0 6px rgba(16,185,129,0.25))",
            "drop-shadow(0 0 22px rgba(16,185,129,0.55))",
            "drop-shadow(0 0 6px rgba(16,185,129,0.25))",
          ],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles className="h-8 w-8 text-[#10B981]" />
      </motion.div>

      <h2 className="mt-6 font-heading text-2xl font-bold tracking-tight">Prêt à faire parler vos données ?</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
        GESCOP va croiser vos données financières et opérationnelles. En quelques secondes, mettez en lumière vos
        risques cachés et découvrez les leviers pour optimiser votre rentabilité.
      </p>

      <motion.button
        onClick={onStart}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="mt-7 inline-flex items-center justify-center rounded-xl border-2 border-[#10B981] bg-white px-5 py-2.5 text-sm font-semibold text-[#10B981] transition-shadow duration-150 hover:shadow-lg hover:shadow-emerald-500/20"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Démarrer mon diagnostic
      </motion.button>
    </motion.div>
  );
}
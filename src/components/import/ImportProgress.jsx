import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, ScanText, Wand2, Database, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { icon: Upload, label: "Téléversement des fichiers", hint: "Transfert sécurisé vers GESCOP" },
  { icon: ScanText, label: "Extraction des données", hint: "Lecture des feuilles, colonnes et lignes" },
  { icon: Wand2, label: "Normalisation", hint: "Dates, montants, catégories et doublons" },
  { icon: Database, label: "Enregistrement", hint: "Rattachement à vos indicateurs" },
];

export default function ImportProgress({ phase }) {
  // phase: "uploading" | "analyzing" | "processing"
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (phase === "uploading") {
      setStep(0);
      return;
    }
    setStep(1);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 3500);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <div className="mx-auto max-w-md">
      <motion.div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10B981]/10"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Loader2 className="h-7 w-7 animate-spin text-[#10B981]" />
      </motion.div>

      <p className="mt-4 text-center text-sm font-semibold">
        {phase === "uploading"
          ? "Téléversement en cours…"
          : phase === "analyzing"
            ? "Lecture du fichier : repérage des colonnes et du format…"
            : "Extraction et normalisation des données…"}
      </p>

      <div className="mt-6 space-y-2.5 text-left">
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.07 }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200",
                active ? "bg-[#10B981]/[0.07]" : "bg-transparent"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                  done ? "bg-[#10B981]/15 text-[#10B981]"
                    : active ? "bg-[#10B981]/15 text-[#10B981]"
                    : "bg-muted text-muted-foreground/60"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <s.icon className={cn("h-4 w-4", active && "animate-pulse")} />}
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-medium", done || active ? "text-foreground" : "text-muted-foreground/70")}>
                  {s.label}
                </p>
                {active && <p className="text-xs text-muted-foreground">{s.hint}</p>}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full w-1/3 rounded-full bg-[#10B981]"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/hooks/useCompany";
import EmptyState from "@/components/EmptyState";
import ReactMarkdown from "react-markdown";
import { MessageSquare, Send, Loader2, Sparkles, Database } from "lucide-react";

const CLASSIFICATION_CONFIG = {
  FACT: { label: "Fait vérifié", color: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300" },
  CALCULATION: { label: "Calcul arithmétique", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300" },
  OBSERVATION: { label: "Observation factuelle", color: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-300" },
  INFERENCE: { label: "Analyse déductive", color: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-300" },
  HYPOTHESIS: { label: "Hypothèse", color: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300" },
  RECOMMENDATION: { label: "Recommandation stratégique", color: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300" },
};

const suggestions = [
  "Analyse la rentabilité de mes succursales",
  "Quels sont mes principaux risques financiers et de trésorerie ?",
  "Où puis-je réduire mes coûts et charges récurrentes ?",
  "Quels sont mes produits les plus et moins rentables ?",
  "Quel est le bilan et l'efficacité de mes campagnes marketing ?",
  "Que dois-je prioriser cette semaine pour maximiser le cash ?",
];

export default function Assistant() {
  const { company } = useCompany();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text) => {
    const content = text || input;
    if (!content || loading) return;
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("chatAssistant", { message: content, history: messages });
      const data = res.data || res;
      if (data.error) {
        setMessages((m) => [...m, { role: "assistant", content: "Erreur: " + data.error }]);
      } else {
        setMessages((m) => [...m, { 
          role: "assistant", 
          content: data.response, 
          sources: data.sources || [],
          classification: data.classification,
          confidence: data.confidence
        }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Erreur: " + (e.response?.data?.error || e.message) }]);
    } finally {
      setLoading(false);
    }
  };

  if (!company) return <EmptyState icon={Sparkles} title="Assistant non disponible" description="Configurez votre entreprise pour utiliser l'assistant conversationnel." />;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Assistant GESCOP</h1>
        <p className="mt-1 text-sm text-muted-foreground">Posez vos questions en langage naturel. L'IA répond à partir de vos données et cite ses sources.</p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium">Que voulez-vous comprendre ?</p>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-lg border border-border bg-background px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">{s}</button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                    {m.classification && (
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${CLASSIFICATION_CONFIG[m.classification]?.color || "bg-primary/20 text-primary border-primary/30"}`}>
                          {CLASSIFICATION_CONFIG[m.classification]?.label || m.classification}
                        </span>
                        {m.confidence != null && (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Indice de confiance : {m.confidence > 1 ? Math.round(m.confidence) : Math.round(m.confidence * 100)} %
                          </span>
                        )}
                      </div>
                    )}
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 space-y-1 border-t border-border/50 pt-2">
                        {m.sources.map((s, j) => (
                          <p key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Database className="h-3 w-3 shrink-0 mt-0.5" /> {s}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : <p className="whitespace-pre-wrap">{m.content}</p>}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">GESCOP réfléchit…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Posez votre question…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={loading} />
        <Button onClick={() => send()} disabled={loading || !input} className="rounded-xl px-5"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
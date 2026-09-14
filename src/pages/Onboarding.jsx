import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ArrowRight, Check, Loader2, Globe, Wand2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const objectives = [
  "Augmenter les ventes",
  "Améliorer la rentabilité",
  "Réduire les coûts",
  "Améliorer la trésorerie",
  "Automatiser",
  "Développer un marché",
  "Réduire les risques",
  "Améliorer la productivité",
  "Préparer une croissance",
];

const sectors = [
  "Commerce de détail",
  "Services professionnels",
  "Restauration",
  "Construction",
  "Manufacturier",
  "Technologie",
  "Santé",
  "Autre",
];

const toolOptions = [
  "Excel",
  "QuickBooks",
  "Sage",
  "Wave",
  "FreshBooks",
  "Shopify",
  "WooCommerce",
  "Stripe",
  "Google Workspace",
  "Microsoft 365",
  "Salesforce",
  "HubSpot",
  "Mailchimp",
  "Slack",
  "Trello",
  "Asana",
  "Notion",
  "Zoho",
];

const STEP_TITLES = [
  "Identité de l'entreprise",
  "Activité & clientèle",
  "Vos objectifs",
  "Vérification",
];

// Libelle affiche dans le recapitulatif quand un champ n'a pas ete rempli.
const EMPTY = "Non renseigné";

// Label avec marqueur d'auto-remplissage : l'utilisateur doit pouvoir
// distinguer ce qu'il a saisi de ce que l'extraction du site web a devine,
// sinon il valide des informations sur sa propre entreprise sans les relire.
function FieldLabel({ children, autofilled }) {
  return (
    <div className="flex items-center gap-2">
      <Label>{children}</Label>
      {autofilled && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          Auto-rempli — à vérifier
        </span>
      )}
    </div>
  );
}

function RecapRow({ label, value }) {
  const empty = value === undefined || value === null || value === "" || value.length === 0;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm", empty ? "italic text-muted-foreground/70" : "font-medium text-foreground")}>
        {empty ? EMPTY : value}
      </span>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { refetch } = useCompany();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState("");
  const [autofilled, setAutofilled] = useState([]);
  const [form, setForm] = useState({
    name: "",
    website: "",
    sector: "",
    location: "Québec, Canada",
    employee_count: 1,
    business_model: "",
    products: "",
    services: "",
    clientele: "",
    revenue: "",
    tools: [],
    objectives: [],
  });

  // Toute saisie manuelle retire le marqueur "auto-rempli" du champ concerne.
  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setAutofilled((list) => list.filter((k) => k !== key));
    if (key === "name" && value) setError("");
  };

  const handleEnrich = async () => {
    if (!form.website) {
      toast({ title: "Entrez d'abord l'URL de votre site web", variant: "destructive" });
      return;
    }
    setEnriching(true);
    try {
      let url = form.website.trim();
      if (!/^https?:\/\//.test(url)) url = "https://" + url;
      const res = await base44.functions.invoke("enrichFromWebsite", {
        website_url: url,
        company_name: form.name,
      });
      const data = res.data || res;
      if (data.error) {
        toast({ title: data.error, variant: "destructive" });
      } else {
        const info = data.company_info || {};
        const filled = [];
        setForm((f) => {
          const next = { ...f };
          const apply = (key, incoming, isDefault = false) => {
            const isEmpty = isDefault ? next[key] === "Québec, Canada" : !next[key];
            if (isEmpty && incoming) {
              next[key] = incoming;
              filled.push(key);
            }
          };
          apply("name", info.name);
          apply("sector", info.sector);
          apply("location", info.location, true);
          apply("business_model", info.business_model);
          apply("products", info.products);
          apply("services", info.services);
          apply("clientele", info.clientele);
          return next;
        });
        setAutofilled((list) => Array.from(new Set([...list, ...filled])));
        toast({
          title: filled.length
            ? `${filled.length} champ(s) remplis depuis votre site web — relisez-les`
            : "Aucun champ vide à remplir depuis votre site web",
        });
      }
    } catch (e) {
      toast({ title: "Erreur: " + (e.response?.data?.error || e.message), variant: "destructive" });
    } finally {
      setEnriching(false);
    }
  };

  const toggleTool = (tool) => {
    setForm((f) => ({
      ...f,
      tools: f.tools.includes(tool)
        ? f.tools.filter((t) => t !== tool)
        : [...f.tools, tool],
    }));
  };

  const toggleObjective = (obj) => {
    setForm((f) => ({
      ...f,
      objectives: f.objectives.includes(obj)
        ? f.objectives.filter((o) => o !== obj)
        : [...f.objectives, obj],
    }));
  };

  // Le nom etait verifie seulement au tout dernier clic, apres trois ecrans de
  // saisie : on bloque des la premiere etape, la ou l'erreur est corrigeable.
  const goToActivity = () => {
    if (!form.name.trim()) {
      setError("Le nom de l'entreprise est requis pour continuer.");
      return;
    }
    setError("");
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Le nom de l'entreprise est requis.");
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Company.create({
        ...form,
        tools: Array.isArray(form.tools) ? form.tools.join(", ") : form.tools,
        revenue: form.revenue ? Number(form.revenue) : 0,
        employee_count: Number(form.employee_count) || 1,
        onboarded: true,
        health_score: 0,
      });
      await refetch();
      toast({ title: "Entreprise configurée avec succès" });
      navigate("/");
    } catch (e) {
      toast({ title: "Erreur: " + e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isAuto = (key) => autofilled.includes(key);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">GESCOP</h1>
            <p className="text-sm text-muted-foreground">Configurez votre entreprise</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {/* Indicateur d'etape : les points seuls ne disaient ni ou l'on est,
              ni combien il reste — un lecteur d'ecran n'en tirait rien. */}
          <div className="mb-8">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Étape {step + 1} sur {STEP_TITLES.length} — {STEP_TITLES[step]}
            </p>
            <div
              className="flex items-center justify-center gap-2"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEP_TITLES.length}
              aria-valuenow={step + 1}
              aria-label={`Étape ${step + 1} sur ${STEP_TITLES.length} : ${STEP_TITLES[step]}`}
            >
              {STEP_TITLES.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step ? "w-10 bg-primary" : i < step ? "w-6 bg-primary/40" : "w-6 bg-muted"
                  )}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{STEP_TITLES[0]}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel autofilled={isAuto("name")}>Nom de l'entreprise *</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Ex. Boulangerie du Quartier"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Site web de l'entreprise</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        className="pl-9"
                        value={form.website}
                        onChange={(e) => setField("website", e.target.value)}
                        placeholder="Ex. www.monsite.ca"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleEnrich}
                      disabled={enriching}
                    >
                      {enriching ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recherche…</>
                      ) : (
                        <><Wand2 className="mr-2 h-4 w-4" /> Auto-remplir</>
                      )}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Remplit uniquement les champs encore vides. Les champs ainsi complétés sont marqués : relisez-les avant de valider.
                  </p>
                </div>
                <div>
                  <FieldLabel autofilled={isAuto("sector")}>Secteur</FieldLabel>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.sector}
                    onChange={(e) => setField("sector", e.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {sectors.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel autofilled={isAuto("location")}>Localisation</FieldLabel>
                  <Input
                    value={form.location}
                    onChange={(e) => setField("location", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nombre d'employés</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.employee_count}
                    onChange={(e) => setField("employee_count", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Chiffre d'affaires annuel ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.revenue}
                    onChange={(e) => setField("revenue", e.target.value)}
                    placeholder="Ex. 250000"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={goToActivity}>
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{STEP_TITLES[1]}</h2>
              <div>
                <FieldLabel autofilled={isAuto("business_model")}>Modèle d'affaires</FieldLabel>
                <Input
                  value={form.business_model}
                  onChange={(e) => setField("business_model", e.target.value)}
                  placeholder="Ex. Vente au détail, B2B, Abonnement…"
                />
              </div>
              <div>
                <FieldLabel autofilled={isAuto("products")}>Produits</FieldLabel>
                <Textarea
                  value={form.products}
                  onChange={(e) => setField("products", e.target.value)}
                  placeholder="Décrivez vos principaux produits…"
                  rows={2}
                />
              </div>
              <div>
                <FieldLabel autofilled={isAuto("services")}>Services</FieldLabel>
                <Textarea
                  value={form.services}
                  onChange={(e) => setField("services", e.target.value)}
                  placeholder="Décrivez vos principaux services…"
                  rows={2}
                />
              </div>
              <div>
                <FieldLabel autofilled={isAuto("clientele")}>Clientèle</FieldLabel>
                <Textarea
                  value={form.clientele}
                  onChange={(e) => setField("clientele", e.target.value)}
                  placeholder="Qui sont vos clients? …"
                  rows={2}
                />
              </div>
              <div>
                <Label>Outils déjà utilisés</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {toolOptions.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      role="checkbox"
                      aria-checked={form.tools.includes(tool)}
                      onClick={() => toggleTool(tool)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all",
                        form.tools.includes(tool)
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          form.tools.includes(tool)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {form.tools.includes(tool) && <Check className="h-2.5 w-2.5" aria-hidden="true" />}
                      </div>
                      {tool}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(0)}>Retour</Button>
                <Button onClick={() => setStep(2)}>
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{STEP_TITLES[2]}</h2>
              <p className="text-sm text-muted-foreground">
                Ces objectifs orientent les recommandations produites par le système.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {objectives.map((obj) => (
                  <button
                    key={obj}
                    type="button"
                    role="checkbox"
                    aria-checked={form.objectives.includes(obj)}
                    onClick={() => toggleObjective(obj)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                      form.objectives.includes(obj)
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border",
                        form.objectives.includes(obj)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {form.objectives.includes(obj) && <Check className="h-3 w-3" aria-hidden="true" />}
                    </div>
                    {obj}
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-6">
                <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
                <Button onClick={() => setStep(3)}>
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Relecture avant creation : ces informations orientent ensuite toutes
              les analyses, elles meritent un dernier coup d'oeil. */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">{STEP_TITLES[3]}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vérifiez les informations avant de créer votre espace. Vous pourrez les modifier plus tard dans Paramètres.
                </p>
              </div>

              {autofilled.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
                  {autofilled.length} champ(s) ont été remplis automatiquement depuis votre site web. Confirmez qu'ils décrivent bien votre entreprise.
                </div>
              )}

              <div className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{STEP_TITLES[0]}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Modifier
                  </Button>
                </div>
                <RecapRow label="Nom" value={form.name} />
                <RecapRow label="Site web" value={form.website} />
                <RecapRow label="Secteur" value={form.sector} />
                <RecapRow label="Localisation" value={form.location} />
                <RecapRow label="Employés" value={String(form.employee_count || "")} />
                <RecapRow
                  label="Chiffre d'affaires annuel"
                  value={form.revenue ? `${Number(form.revenue).toLocaleString("fr-CA")} $` : ""}
                />
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{STEP_TITLES[1]}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Modifier
                  </Button>
                </div>
                <RecapRow label="Modèle d'affaires" value={form.business_model} />
                <RecapRow label="Produits" value={form.products} />
                <RecapRow label="Services" value={form.services} />
                <RecapRow label="Clientèle" value={form.clientele} />
                <RecapRow label="Outils" value={form.tools.join(", ")} />
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{STEP_TITLES[2]}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Modifier
                  </Button>
                </div>
                <RecapRow label="Objectifs" value={form.objectives.join(", ")} />
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>Retour</Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Configuration…</>
                  ) : (
                    <>Créer mon espace <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

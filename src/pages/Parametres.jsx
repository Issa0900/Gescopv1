import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Settings, Save, Check, Shield, LogOut, User, FileLock2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import CompetitorsManager from "@/components/settings/CompetitorsManager";

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

export default function Parametres() {
  const { company, refetch } = useCompany();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  React.useEffect(() => {
    if (company) {
      setForm({
        name: company.name || "",
        website: company.website || "",
        sector: company.sector || "",
        location: company.location || "",
        employee_count: company.employee_count || 1,
        business_model: company.business_model || "",
        products: company.products || "",
        services: company.services || "",
        clientele: company.clientele || "",
        suppliers: company.suppliers || "",
        revenue: company.revenue || "",
        tools: company.tools || "",
        objectives: company.objectives || [],
      });
    }
  }, [company]);

  if (!company) {
    return <p className="text-sm text-muted-foreground">Aucune entreprise configurée.</p>;
  }
  if (!form) return null;

  const toggleObjective = (obj) => {
    setForm((f) => ({
      ...f,
      objectives: f.objectives.includes(obj)
        ? f.objectives.filter((o) => o !== obj)
        : [...f.objectives, obj],
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Company.update(company.id, {
        ...form,
        revenue: Number(form.revenue) || 0,
        employee_count: Number(form.employee_count) || 1,
      });
      await refetch();
      toast({ title: "Modifications enregistrées" });
    } catch (e) {
      toast({ title: "Erreur: " + e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="mt-1 text-muted-foreground">Profil de l'entreprise et objectifs de pilotage.</p>
      </div>

      {/* Company profile */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Profil de l'entreprise</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nom</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Site web</Label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://exemple.com" />
          </div>
          <div>
            <Label>Secteur</Label>
            <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
          </div>
          <div>
            <Label>Localisation</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label>Employés</Label>
            <Input type="number" value={form.employee_count} onChange={(e) => setForm({ ...form, employee_count: e.target.value })} />
          </div>
          <div>
            <Label>Chiffre d'affaires ($)</Label>
            <Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Modèle d'affaires</Label>
            <Input value={form.business_model} onChange={(e) => setForm({ ...form, business_model: e.target.value })} />
          </div>
          <div>
            <Label>Produits</Label>
            <Textarea value={form.products} onChange={(e) => setForm({ ...form, products: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Services</Label>
            <Textarea value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Clientèle</Label>
            <Textarea value={form.clientele} onChange={(e) => setForm({ ...form, clientele: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Fournisseurs</Label>
            <Textarea value={form.suppliers} onChange={(e) => setForm({ ...form, suppliers: e.target.value })} rows={2} placeholder="Principaux fournisseurs" />
          </div>
          <div className="sm:col-span-2">
            <Label>Outils utilisés</Label>
            <Input value={form.tools} onChange={(e) => setForm({ ...form, tools: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Objectives */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-1 font-semibold">Objectifs</h2>
        <p className="mb-4 text-sm text-muted-foreground">Ces objectifs orientent les recommandations du système.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {objectives.map((obj) => (
            <button
              key={obj}
              onClick={() => toggleObjective(obj)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                form.objectives.includes(obj)
                  ? "border-primary bg-primary/5"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded border",
                form.objectives.includes(obj) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
              )}>
                {form.objectives.includes(obj) && <Check className="h-3 w-3" />}
              </div>
              {obj}
            </button>
          ))}
        </div>
      </div>

      {/* Security info */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold">Sécurité & conformité</h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>✓ Données hébergées au Canada</p>
          <p>✓ Conforme à la Loi 25 (protection des renseignements personnels, Québec)</p>
          <p>✓ Chiffrement des données au repos et en transit</p>
          <p>✓ Séparation des organisations — vos données ne sont jamais partagées</p>
          <p>✓ Journal d'audit complet des imports</p>
        </div>
        <Link
          to="/politique-confidentialite"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent/30"
        >
          <FileLock2 className="h-4 w-4 text-primary" />
          Consulter la politique de confidentialité
        </Link>
      </div>

      {/* Competitors */}
      <CompetitorsManager />

      {/* Account */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Compte</h2>
        </div>
        {user && (
          <div className="mb-4 space-y-1">
            <p className="text-sm font-medium">{user.full_name || user.email}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs capitalize text-muted-foreground">Rôle: {user.role || "utilisateur"}</p>
          </div>
        )}
        <Button variant="outline" onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </div>
    </div>
  );
}
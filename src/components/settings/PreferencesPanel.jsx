import React from "react";
import { Link } from "react-router-dom";
import {
  Sliders,
  Globe,
  DollarSign,
  Calendar,
  Bell,
  ShieldCheck,
  FileLock2,
  LogOut
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/AuthContext";

export default function PreferencesPanel({ form, setForm }) {
  const { logout } = useAuth();

  const updatePreference = (key, val) => {
    setForm({
      ...form,
      preferences: {
        ...(form.preferences || {}),
        [key]: val
      }
    });
  };

  const prefs = form.preferences || {
    alert_frequency: "daily",
    notify_anomalies: true,
    notify_radar_signals: true,
    date_format: "YYYY-MM-DD",
    number_format: "fr-CA"
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Préférences Régionales & Affichage</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnalisez la devise, la langue de restitution et les paramètres de formatage de GESCOP.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Langue */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Globe className="h-4 w-4 text-primary" />
              Langue de l'interface et des analyses
            </Label>
            <select
              value={form.language || "fr"}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="fr">Français (Canada - Français québécois)</option>
              <option value="en">English (Canada / US)</option>
            </select>
          </div>

          {/* Devise */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <DollarSign className="h-4 w-4 text-primary" />
              Devise de référence
            </Label>
            <select
              value={form.currency || "CAD"}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="CAD">$ CAD — Dollar canadien (par défaut)</option>
              <option value="USD">$ USD — Dollar américain</option>
              <option value="EUR">€ EUR — Euro</option>
            </select>
          </div>

          {/* Format de date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Format des dates
            </Label>
            <select
              value={prefs.date_format}
              onChange={(e) => updatePreference("date_format", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="YYYY-MM-DD">AAAA-MM-JJ (Norme ISO — ex. 2026-09-17)</option>
              <option value="DD/MM/YYYY">JJ/MM/AAAA (Format canadien français — ex. 17/09/2026)</option>
              <option value="MM/DD/YYYY">MM/JJ/AAAA (Format nord-américain)</option>
            </select>
          </div>

          {/* Format des nombres */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Sliders className="h-4 w-4 text-primary" />
              Séparateur décimal et monétaire
            </Label>
            <select
              value={prefs.number_format}
              onChange={(e) => updatePreference("number_format", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="fr-CA">1 234,56 $ (Espace pour milliers, virgule pour décimale)</option>
              <option value="en-CA">$1,234.56 (Virgule pour milliers, point pour décimale)</option>
            </select>
          </div>
        </div>

        {/* Notifications & Alertes */}
        <div className="mt-8 border-t border-border pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Notifications & Veille Proactive</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <h4 className="text-sm font-medium text-foreground">Alertes d'anomalies critiques</h4>
                <p className="text-xs text-muted-foreground">
                  Alerte immédiate si une baisse brutale de marge ou une rupture de stock majeure est détectée.
                </p>
              </div>
              <Switch
                checked={prefs.notify_anomalies !== false}
                onCheckedChange={(val) => updatePreference("notify_anomalies", val)}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <h4 className="text-sm font-medium text-foreground">Signaux faibles du Radar</h4>
                <p className="text-xs text-muted-foreground">
                  Notification lors de mouvements stratégiques de concurrents ou tendances de marché significatives.
                </p>
              </div>
              <Switch
                checked={prefs.notify_radar_signals !== false}
                onCheckedChange={(val) => updatePreference("notify_radar_signals", val)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <h4 className="text-sm font-medium text-foreground">Fréquence du bulletin exécutif</h4>
                <p className="text-xs text-muted-foreground">
                  Synthèse stratégique envoyée par courriel aux gestionnaires.
                </p>
              </div>
              <select
                value={prefs.alert_frequency}
                onChange={(e) => updatePreference("alert_frequency", e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="realtime">En temps réel (dès détection)</option>
                <option value="daily">Quotidien (matin à 8h00)</option>
                <option value="weekly">Hebdomadaire (lundi matin)</option>
                <option value="never">Désactivé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sécurité, Souveraineté & Loi 25 */}
        <div className="mt-8 border-t border-border pt-6">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <ShieldCheck className="h-5 w-5" />
              Souveraineté des données & Loi 25 (Québec)
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>✓ Vos données financières et opérationnelles sont hébergées au Canada et strictement isolées.</p>
              <p>✓ Aucun entraînement de modèles publics externes avec vos chiffres d'affaires ou marges.</p>
              <p>✓ Conforme aux exigences de la Loi 25 du Québec sur la gouvernance des renseignements d'affaires.</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                to="/politique-confidentialite"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <FileLock2 className="h-3.5 w-3.5" />
                Consulter la politique de confidentialité
              </Link>
            </div>
          </div>
        </div>

        {/* Déconnexion */}
        <div className="mt-8 border-t border-border pt-6 flex justify-between items-center">
          <div>
            <h4 className="text-sm font-medium text-foreground">Session active</h4>
            <p className="text-xs text-muted-foreground">Fermer votre session actuelle sur cet appareil.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()} className="gap-2 text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}


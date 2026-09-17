import React, { useState } from "react";
import { User, Users, Shield, Lock, Check, Plus, Mail, UserCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const MODULE_PERMISSIONS = [
  { module: "Vue d'ensemble", admin: true, analyst: true, manager: true, observer: true },
  { module: "Radar & Veille", admin: true, analyst: true, manager: true, observer: true },
  { module: "Diagnostic & Santé", admin: true, analyst: true, manager: false, observer: true },
  { module: "Analyses de gestion", admin: true, analyst: true, manager: "Local", observer: true },
  { module: "Catalogue & Moteur KPI", admin: true, analyst: true, manager: "Local", observer: true },
  { module: "Prévisions & Scénarios", admin: true, analyst: true, manager: false, observer: false },
  { module: "Planification stratégique", admin: true, analyst: true, manager: false, observer: false },
  { module: "Importation & Données", admin: true, analyst: true, manager: false, observer: false },
  { module: "Paramètres & Contexte", admin: true, analyst: false, manager: false, observer: false }
];

export default function UsersAccessPanel() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("analyst");
  const [invitedMembers, setInvitedMembers] = useState([
    {
      id: "u1",
      name: user?.full_name || "Administrateur Principal",
      email: user?.email || "admin@gescop.app",
      role: "admin",
      status: "Actif"
    }
  ]);

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInvitedMembers((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        name: inviteEmail.split("@")[0],
        email: inviteEmail.trim(),
        role: inviteRole,
        status: "Invitation envoyée"
      }
    ]);
    setInviteEmail("");
    toast({
      title: "Invitation envoyée",
      description: `Un courriel a été envoyé à ${inviteEmail}.`
    });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary/20 text-primary border-primary/30">Administrateur</Badge>;
      case "analyst":
        return <Badge variant="secondary">Analyste / Décideur</Badge>;
      case "manager":
        return <Badge variant="outline">Gestionnaire succursale</Badge>;
      default:
        return <Badge variant="outline">Observateur</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Utilisateurs, Rôles & Permissions</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les membres de l'organisation et configurez les droits d'accès aux modules décisionnels de GESCOP.
        </p>

        {/* Current User Card */}
        {user && (
          <div className="mt-6 rounded-xl border border-border bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base">
                {(user.full_name || user.email || "U").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{user.full_name || user.email}</h3>
                  <Badge variant="secondary" className="text-[10px]">Session en cours</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div>
              {getRoleBadge(user.role || "admin")}
            </div>
          </div>
        )}

        {/* Invite Member Section */}
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Inviter un collaborateur
          </h3>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="courriel@entreprise.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full sm:w-56"
            >
              <option value="analyst">Analyste / Décideur</option>
              <option value="manager">Gestionnaire de succursale</option>
              <option value="observer">Observateur (Lecture seule)</option>
              <option value="admin">Administrateur</option>
            </select>
            <Button type="submit" size="sm" className="w-full sm:w-auto gap-1.5 h-10 px-4">
              <Plus className="h-4 w-4" />
              Inviter
            </Button>
          </form>
        </div>

        {/* Members Table */}
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Membres de l'organisation ({invitedMembers.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Courriel</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitedMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">{getRoleBadge(m.role)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <UserCheck className="h-3.5 w-3.5" />
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Matrice des privilèges par rôle
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Aperçu des restrictions d'accès configurées dans l'architecture GESCOP.
          </p>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-center text-xs">
              <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Module GESCOP</th>
                  <th className="px-3 py-3">Administrateur</th>
                  <th className="px-3 py-3">Analyste / Décideur</th>
                  <th className="px-3 py-3">Gestionnaire succursale</th>
                  <th className="px-3 py-3">Observateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MODULE_PERMISSIONS.map((p, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="px-4 py-2.5 text-left font-medium text-foreground">{p.module}</td>
                    <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                    <td className="px-3 py-2.5">
                      {p.analyst ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.manager === true ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                      ) : p.manager === "Local" ? (
                        <Badge variant="outline" className="text-[10px]">Sa succursale</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.observer ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


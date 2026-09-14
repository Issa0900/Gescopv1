import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      // La reconnexion reste manuelle (le jeton de reinitialisation n'ouvre pas
      // de session) : on annonce au moins la reussite sur l'ecran de connexion.
      window.location.href = "/login?reinitialise=1";
    } catch (err) {
      setError(err.message || "La réinitialisation a échoué. Le lien est peut-être expiré.");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Lien invalide"
        subtitle="Ce lien de réinitialisation est incomplet ou expiré"
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Demander un nouveau lien
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          Le lien que vous avez utilisé semble incomplet. Veuillez demander un nouveau courriel de réinitialisation.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="Nouveau mot de passe"
      subtitle="Choisissez votre nouveau mot de passe"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {MIN_PASSWORD_LENGTH} caractères minimum.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmer le mot de passe</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Réinitialisation...
            </>
          ) : (
            "Réinitialiser mon mot de passe"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

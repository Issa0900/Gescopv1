import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import PasswordInput from "@/components/PasswordInput";
import ConsentCheckbox from "@/components/ConsentCheckbox";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

const MIN_PASSWORD_LENGTH = 8;

// L'etape de verification ne vivait que dans un state local : un rafraichissement
// ou un retour navigateur ramenait au formulaire vide alors que le compte existait
// deja cote serveur, sans moyen de reprendre la verification. On la persiste le
// temps de l'onglet. Le mot de passe, lui, n'est jamais stocke.
const PENDING_KEY = "gescop.inscription.email_a_verifier";

const readPending = () => {
  try {
    return sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
};

const writePending = (value) => {
  try {
    if (value) sessionStorage.setItem(PENDING_KEY, value);
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Stockage indisponible (navigation privee) : on retombe sur l'ancien
    // comportement, l'inscription reste possible dans l'onglet courant.
  }
};

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [consent, setConsent] = useState(false);
  const lastSubmittedCode = useRef("");

  useEffect(() => {
    const pending = readPending();
    if (pending) {
      setEmail(pending);
      setShowOtp(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!consent) {
      setError("Vous devez accepter la politique de confidentialité pour créer un compte.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      writePending(email);
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "La création du compte a échoué. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code) => {
    const submitted = code || otpCode;
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode: submitted });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      // Le consentement Loi 25 a deja ete donne explicitement sur le formulaire
      // d'inscription : on l'enregistre ici pour ne pas reposer la meme question
      // dans la modale au premier acces. Les comptes crees via Google n'ont pas
      // vu cette case : pour eux, la modale reste le point de consentement.
      try {
        await base44.auth.updateMe({
          public_metadata: {
            privacy_consent_accepted: true,
            privacy_consent_date: new Date().toISOString(),
          }
        });
      } catch {
        // Echec d'enregistrement : la modale de consentement prendra le relais.
      }
      writePending(null);
      window.location.href = safeReturnTo();
    } catch (err) {
      setError(err.message || "Code de vérification invalide.");
    } finally {
      setLoading(false);
    }
  };

  // Verification automatique des que les 6 chiffres sont saisis : le code vient
  // d'etre lu dans un courriel, un clic de plus n'apporte rien.
  useEffect(() => {
    if (showOtp && otpCode.length === 6 && !loading && lastSubmittedCode.current !== otpCode) {
      lastSubmittedCode.current = otpCode;
      handleVerify(otpCode);
    }
  }, [otpCode, showOtp, loading]);

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code renvoyé",
        description: "Consultez votre boîte de réception.",
      });
    } catch (err) {
      setError(err.message || "Impossible de renvoyer le code.");
    }
  };

  const handleChangeEmail = () => {
    writePending(null);
    setShowOtp(false);
    setOtpCode("");
    setError("");
    lastSubmittedCode.current = "";
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Vérifiez votre courriel"
        subtitle={`Nous avons envoyé un code à ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={() => handleVerify()}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Vérification en cours...
            </>
          ) : (
            "Vérifier"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Code non reçu ?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Renvoyer le code
          </button>
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          <button onClick={handleChangeEmail} className="text-primary font-medium hover:underline">
            Ce n'est pas la bonne adresse ?
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Créer votre compte"
      subtitle="Quelques secondes pour commencer à piloter votre entreprise"
      footer={
        <>
          Vous avez déjà un compte ?{" "}
          <Link
            to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")}
            className="text-primary font-medium hover:underline"
          >
            Se connecter
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continuer avec Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">ou</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Adresse courriel</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
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

        {/* Consentement Loi 25 - enregistre des la verification du compte */}
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <ConsentCheckbox id="consent" checked={consent} onChange={setConsent}>
            J'ai lu et j'accepte la{" "}
            <Link
              to="/politique-confidentialite"
              target="_blank"
              className="font-medium text-primary hover:underline"
            >
              politique de confidentialité
            </Link>
            {" "}de GESCOP. Je consens à la collecte, l'utilisation et la communication de mes renseignements personnels aux finalités décrites, conformément à la Loi 25 (Québec).
          </ConsentCheckbox>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !consent}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Création du compte...
            </>
          ) : (
            "Créer mon compte"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

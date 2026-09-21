import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

// Pourcentage au format francais : virgule decimale et espace insecable avant le
// signe. `toFixed()` produit un point ("9.4%"), incoherent avec le reste de
// l'interface qui affiche deja "52 000 $" et "12,5 %".
export function formatPct(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "\u2014";
  return (
    Number(value).toLocaleString("fr-CA", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + "\u00a0%"
  );
}

// Montant en dollars canadiens, format standard de l'app ("52 000 $"). Les
// espaces de `toLocaleString("fr-CA")` sont deja insecables, donc le nombre
// entier ne se coupe jamais au milieu en fin de ligne.
export function formatCAD(amount, decimals = 0) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "\u2014";
  return (
    Number(amount).toLocaleString("fr-CA", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + "\u00a0$"
  );
}

// Nombre simple (quantites, compteurs) avec separateur de milliers fr-CA.
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || Number.isNaN(num)) return "\u2014";
  return Number(num).toLocaleString("fr-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

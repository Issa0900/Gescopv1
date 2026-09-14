# design-sync — notes pour ce dépôt (app GESCOP / Base44)

## Forme du dépôt

- Ce dépôt est une **application Vite/React**, pas un paquet de design system :
  `private: true`, aucun `main`/`module`/`exports`, aucun `dist/` de bibliothèque.
  Le convertisseur tourne donc en **mode entrée synthétisée** depuis `src/`.
- Tout est en **JSX, pas TypeScript** (un seul `.ts` dans le dépôt). Il n'existe aucun
  `.d.ts` : les contrats de props exposés à l'agent de design sont déduits du code par
  ts-morph, donc plus faibles qu'avec un DS typé. C'est la limite de fidélité principale
  de cet import.
- Le convertisseur exige `node_modules/<pkg>/package.json`. npm n'installe pas le paquet
  dans son propre dépôt, d'où le lien à recréer **à chaque clone** :
  `ln -sfn ../ node_modules/base44-app`

## Le correctif qui compte (fork déclaré)

`.design-sync/overrides/source-kit.mjs` — sans lui, **rien ne fonctionne**, sans que ça
se voie tout de suite.

L'entrée synthétisée d'origine n'émet que `export * from <fichier>`. Or une ré-export
étoile ne transporte jamais le `export default` d'un module, et **tous** les composants
produit de GESCOP sont `export default function <Nom>()`. Conséquence : les 300 composants
étaient découverts, documentés, compilés dans le bundle — et pourtant absents de
`window.Gescop`. Chaque aperçu affichait « Element type is invalid ... got: undefined ».

Le fork ajoute `export { default as <Nom> }` à côté de chaque `export *`.
Mesuré : 262 → 346 symboles exposés, 85 exports par défaut récupérés.

Le premier nom déclaré gagne (deux `export default` du même nom seraient une erreur de
syntaxe). En pratique une seule collision : **`Sidebar`** existe en primitive shadcn
(`ui/sidebar.jsx`, export nommé) et en composant produit (`components/Sidebar.jsx`, export
par défaut). L'export explicite masque l'étoile, donc **c'est le composant produit qui
gagne** — la primitive shadcn `Sidebar` n'est pas exposée. Voulu, mais à savoir.

## Choix de configuration

- `cssEntry` pointe vers `.design-sync/.cache/compiled.css`, une copie du CSS compilé par
  Vite (`dist/assets/index-*.css`, ~87 Ko : Tailwind v3 + tokens shadcn). La source
  `src/index.css` ne convient pas — ce sont des directives `@tailwind` non compilées.
  Le nom du fichier dist porte un hash, d'où la copie ; `buildCmd` la régénère.
- Les **29 pages de l'application** (Dashboard, Login, Register…) sont exclues via
  `componentSrcMap` : un écran applicatif n'est pas un composant de design system, et les
  garder polluait le panneau. Idem `ProtectedRoute`, `ScrollToTop`, `PageNotFound`.
- Le groupe `general` (264 composants) regroupe les primitives shadcn : `ui/` fait partie
  des dossiers « génériques » filtrés par le convertisseur pour dériver le groupe. C'est
  le comportement voulu en amont, pas un défaut de config.

## Vérifications faites

- Playwright **1.56.0** exactement : le chromium en cache est le build **1194**, et une
  version plus récente (1.63 → build 1243) échoue sur `Executable doesn't exist`.
- Validation : exit 0, 299/300 aperçus propres, 1 à examiner.
- Contrôlé en conditions réelles (page servie en HTTP, harnais d'aperçu) que
  `window.Gescop` expose bien 346 symboles dont `KpiCard`, `HealthHero`, `Button`,
  `AuthLayout`.

## Avertissements connus

- `[BUNDLE_EXPORT] 300/300 not a component on window.Gescop` : **contredit par la
  mesure à l'exécution** ci-dessus, et non bloquant (validate sort en 0). Son contrôle
  n'évalue manifestement pas le global au runtime. À élucider avant de s'en servir comme
  signal ; ne pas conclure du message que le bundle est cassé.
- `tokens: 3 missing` — sous le seuil, non bloquant.
- Erreurs DOM `removeChild` / `insertBefore` sur certaines pages d'aperçu : liées au
  mécanisme de bascule vers la carte plancher, pas au composant.

## Risques de resynchro

- **Rien n'a encore été téléversé.** Aucun projet Claude Design n'est associé : la session
  d'import n'avait pas l'autorisation (session web). `config.json` ne contient donc pas de
  `projectId` — la prochaine synchro autorisée créera le projet et fera un premier import
  complet.
- Aucun aperçu n'est écrit : les 300 composants partiront en carte plancher tant que
  `.design-sync/previews/<Nom>.tsx` n'est pas rempli. Le lot prévu était ~35 composants
  distinctifs (les 18 de `dashboard/`, `kpis/`, plus une dizaine de primitives).
- Plusieurs composants (`InsightCard`, `RiskCard`, `Sidebar`…) importent `Link` /
  `useLocation` de react-router et rendront vide sans routeur.
  `.design-sync/preview-providers.jsx` existe pour ça (MemoryRouter + TooltipProvider)
  mais **n'est pas encore câblé** : il faut ajouter à la config
  `"extraEntries": ["./.design-sync/preview-providers.jsx"]` et
  `"provider": {"component": "PreviewProviders"}`, puis reconstruire.
- Le CSS compilé dépend du build de l'app : si Tailwind purge des classes qu'aucune page
  n'utilise plus, un composant du DS peut perdre son style sans que rien ne le signale.

## Reprise rapide (session autorisée)

```sh
npm ci
ln -sfn ../ node_modules/base44-app          # requis, non versionné
npm run build && mkdir -p .design-sync/.cache \
  && cp dist/assets/index-*.css .design-sync/.cache/compiled.css
/design-sync                                  # lit ce dossier et repart d'ici
```

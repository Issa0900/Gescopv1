import React, { useState } from "react";
import { 
  ChevronDown, Lightbulb, Upload, LayoutDashboard, BarChart3, AlertTriangle, 
  ShieldAlert, Radar as RadarIcon, CheckSquare, Bell, FileText, MessageSquare, 
  Settings, Sparkles, Rocket, Brain, TrendingUp, Calculator, Target, History, 
  Users, Package, Megaphone, Wallet, ShieldCheck, CheckCircle2, HelpCircle, 
  ArrowRight, Check, AlertCircle, Info, Building2, Landmark, Truck, Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import ManualTableOfContents from "@/components/ManualTableOfContents";
import BrandLogo from "@/components/BrandLogo";

const groups = [
  {
    label: "1. Cadrage & Prérequis",
    sections: [
      {
        id: "perimetre",
        title: "Périmètre, Cible & Prérequis",
        icon: Target,
        badge: "Fondations",
        objective: "Identifier les prérequis techniques, les rôles d'accès et les règles de conformité avant toute manipulation.",
        content: [
          {
            h: "1. Public cible & Niveau technique requis",
            action: "Identifiez votre rôle d'accès dans GESCOP pour adapter votre usage :",
            steps: [
              "Direction Générale (CEO / Fondateur) : Consultation du Score de Santé, des priorités du jour et dialogue stratégique avec l'Assistant.",
              "Direction Financière & Comptabilité (CFO / DAF / Contrôleur) : Validation des imports P&L, suivi de trésorerie, DPA et clôtures mensuelles.",
              "Direction des Opérations & Ventes (COO / Responsable Magasins) : Pilotage multi-succursales, gestion des stocks et marges par produit.",
              "Équipe Marketing & Service Client : Mesure du ROAS, coûts d'acquisition (CAC) et gestion des réclamations clients."
            ],
            successIndicator: "Aucune compétence en programmation n'est requise. La maîtrise d'un tableur (Excel ou Google Sheets) suffit pour exploiter 100% de la plateforme.",
            tip: "Un mode démonstration préchargé avec une simulation complète est disponible pour tester les fonctionnalités sans risque."
          },
          {
            h: "2. Objectif unique du document",
            action: "Ce que vous saurez accomplir à la fin de la lecture de ce guide :",
            steps: [
              "Configurer votre profil d'entreprise en moins de 3 minutes.",
              "Glisser-déposer vos classeurs Excel comptables et opérationnels sans rejet ni blocage.",
              "Interpréter les indicateurs financiers clés ($ CAD) et piloter vos succursales.",
              "Poser des questions complexes à l'Assistant IA pour obtenir des décisions chiffrées actionnables."
            ],
            successIndicator: "Vous serez en mesure de mener un cycle de pilotage mensuel complet en totale autonomie."
          },
          {
            h: "3. Prérequis matériels & Données sources",
            action: "Rassemblez les éléments suivants avant d'entamer les étapes :",
            steps: [
              "Navigateur web récent : Google Chrome, Microsoft Edge, Mozilla Firefox ou Apple Safari (résolution recommandée : 1280×800 minimum).",
              "Vos fichiers de données d'entreprise : Relevés bancaires CSV, exports de caisse POS, fichiers de paie ou exports Excel de vos logiciels (QuickBooks, Shopify, Acomba, Sage).",
              "Un compte utilisateur actif avec le rôle Administrateur ou Analyste."
            ],
            successIndicator: "Vos fichiers sont prêts sur votre poste de travail au format .xlsx ou .csv."
          },
          {
            h: "4. Règles critiques & Conformité Loi 25 (Québec)",
            action: "Respectez impérativement ces trois consignes de gouvernance des données :",
            steps: [
              "Souveraineté des données : GESCOP héberge l'ensemble des données au Canada dans des centres certifiés SOC2 et ISO 27001.",
              "Protection des renseignements personnels : Ne chargez jamais de numéros d'assurance sociale (NAS) ou de cartes de crédit complètes.",
              "Traçabilité immuable : Chaque écriture importée conserve un identifiant d'import et son contenu original d'archive."
            ],
            warning: "Conformité Loi 25 : En cas de suppression demandée par un client, utilisez le module Clients pour anonymiser sa fiche en un clic."
          }
        ]
      }
    ]
  },
  {
    label: "2. Mise en route pas-à-pas",
    sections: [
      {
        id: "onboarding",
        title: "Étape 1 : Configuration initiale (3 minutes)",
        icon: Sparkles,
        badge: "Démarrage",
        objective: "Établir la carte d'identité de l'entreprise pour contextualiser l'ensemble des analyses financières et prédictives.",
        content: [
          {
            h: "Action 1 : Renseigner l'identité de l'entreprise",
            action: "Complétez la fiche d'identification dès votre première connexion :",
            steps: [
              "Accédez à l'écran de configuration initiale ou rendez-vous dans le menu « Paramètres ».",
              "Saisissez la raison sociale légale, le secteur d'activité (ex. Commerce de détail plein air) et la localisation principale.",
              "Renseignez l'URL publique de votre site web et cliquez sur le bouton « Auto-remplir avec l'IA ».",
              "Vérifiez les données extraites automatiquement (description d'activité, effectif estimé) et validez."
            ],
            successIndicator: "La fiche affiche le badge vert « Entreprise configurée » avec le logo et la devise par défaut ($ CAD).",
            tip: "Si votre site web est protégé par un mot de passe ou indisponible, vous pouvez saisir les champs manuellement en moins de 60 secondes."
          },
          {
            h: "Action 2 : Définir le modèle d'affaires & les succursales",
            action: "Précisez l'organisation opérationnelle de votre entreprise :",
            steps: [
              "Sélectionnez vos canaux de distribution : Magasins physiques, Boutique en ligne (E-commerce), Vente B2B aux professionnels.",
              "Dans la section Succursales, enregistrez vos points de vente réels (ex. Web, Lévis, Chicoutimi, Québec, Trois-Rivières).",
              "Sélectionnez les logiciels tiers que vous utilisez déjà pour adapter le vocabulaire d'ingestion."
            ],
            successIndicator: "La liste des succursales actives est visible dans les filtres de rapport.",
            warning: "Ne confondez pas une « Succursale » (lieu physique de vente ou entrepôt) avec un « Département » (service interne comme Comptabilité ou RH)."
          },
          {
            h: "Action 3 : Fixer vos objectifs stratégiques de l'exercice",
            action: "Indiquez à GESCOP vos cibles prioritaires pour guider ses recommandations :",
            steps: [
              "Définissez un objectif de rentabilité (ex. Marge brute cible : 50 %).",
              "Définissez un seuil de sécurité de trésorerie (ex. Réserve minimale : 50 000 $ CAD).",
              "Enregistrez vos priorités de croissance (ex. Réduction du coût d'acquisition client de 10 %)."
            ],
            successIndicator: "Les barres de progression de vos objectifs apparaissent sur le Tableau de bord avec les écarts en temps réel."
          }
        ]
      },
      {
        id: "import",
        title: "Étape 2 : Ingestion Universelle des Données",
        icon: Upload,
        badge: "Import V3",
        objective: "Importer vos données comptables, commerciales et de stocks sans friction grâce au moteur d'ingestion sémantique.",
        content: [
          {
            h: "Action 1 : Préparer et déposer vos fichiers",
            action: "Glissez vos fichiers dans la zone d'importation dédiée :",
            steps: [
              "Cliquez sur « Importer des données » dans le menu latéral gauche.",
              "Glissez-déposez votre classeur Excel (.xlsx) complet ou sélectionnez plusieurs fichiers CSV en même temps.",
              "Patientez 3 à 5 secondes pendant que le Moteur Universel V3 profile la structure de chaque feuille."
            ],
            successIndicator: "Un panneau d'analyse s'affiche en listant chaque feuille détectée avec son entité cible (ex. Ventes → Order, Stocks → Inventory).",
            tip: "GESCOP gère les classeurs multi-feuilles : un seul fichier Excel contenant 7 à 14 feuilles est reconnu et ventilé automatiquement !"
          },
          {
            h: "Action 2 : Vérifier la reconnaissance des colonnes",
            action: "Contrôlez l'alignement des colonnes suggéré par le système :",
            steps: [
              "Vérifiez que chaque colonne source est reliée au concept métier équivalent (ex. « Qte_En_Stock » → closing_stock).",
              "Les variations d'écritures, abréviations (Qte, Mnt, Tx, Ca) et devises ($ CAD) sont résolues automatiquement.",
              "Les colonnes vides de grille Excel (ex. col_7, col_8) sont automatiquement neutralisées sans bloquer l'import.",
              "Cliquez sur « Confirmer et importer »."
            ],
            successIndicator: "Le rapport d'importation affiche : « 100% des lignes traitées avec succès — 0 rejet ».",
            warning: "Si une colonne affiche « Ignorer » alors qu'elle contient une donnée importante, cliquez dessus et sélectionnez manuellement le champ dans la liste déroulante."
          },
          {
            h: "Action 3 : Valider le score de qualité des données",
            action: "Vérifiez la conformité de l'ingestion sur la page Audit :",
            steps: [
              "Consultez l'indicateur de complétude globale (viser un score supérieur à 90%).",
              "Vérifiez que le tableau de quarantaine est vide (0 ligne rejetée).",
              "Si des lignes sont en quarantaine, consultez le motif explicatif (ex. date invalide ou montant textuel) pour corriger votre source."
            ],
            successIndicator: "La pastille de statut affiche « Données saines » et l'ensemble des modules applicatifs sont instantanément alimentés."
          }
        ]
      }
    ]
  },
  {
    label: "3. Pilotage opérationnel & Modules",
    sections: [
      {
        id: "dashboard",
        title: "Tableau de Bord & Score de Santé 360°",
        icon: LayoutDashboard,
        badge: "Quotidien",
        objective: "Évaluer la santé globale de l'entreprise en un coup d'œil et identifier les priorités d'action du matin.",
        content: [
          {
            h: "Action 1 : Consulter le Score de Santé Global",
            action: "Analysez la jauge centrale dès votre connexion quotidienne :",
            steps: [
              "La jauge centrale indique un score de 0 à 100 calculé exclusivement sur vos données réelles.",
              "Vert (80-100) : Excellente situation financière et opérationnelle.",
              "Jaune (60-79) : Points de vigilance modérés nécessitant un arbitrage.",
              "Rouge (< 60) : Tension critique sur la trésorerie, la rentabilité ou les ruptures de stock."
            ],
            successIndicator: "Chaque dimension mesurée affiche sa tendance par rapport au mois précédent (▲ Hausse, ▼ Baisse, ▬ Stable)."
          },
          {
            h: "Action 2 : Déclencher l'Audit Stratégique IA",
            action: "Lancez une mise à jour complète de l'analyse décisionnelle :",
            steps: [
              "Cliquez sur le bouton « Lancer l'analyse » situé en haut à droite du tableau de bord.",
              "L'algorithme croise simultanément les 11 domaines (ventes, trésorerie, paie, stocks, campagnes marketing).",
              "Patientez pendant l'audit (généralement 5 à 10 secondes)."
            ],
            successIndicator: "Le bloc « Priorités critiques du jour » est renouvelé avec des actions concrètes et chiffrées."
          }
        ]
      },
      {
        id: "finance",
        title: "Module Finance & Compte de Résultat (P&L)",
        icon: Landmark,
        badge: "Rentabilité",
        objective: "Contrôler le chiffre d'affaires, la structure de coûts (COGS/OpEx) et la marge nette réelle.",
        content: [
          {
            h: "Action 1 : Analyser la cascade de marge",
            action: "Suivez la décomposition de vos résultats financiers :",
            steps: [
              "Consultez les 4 indicateurs cardinaux : Chiffre d'affaires total, Coût des ventes (CMV), Résultat net et Marge nette %.",
              "Survolez les barres du graphique mensuel pour comparer l'évolution des revenus face aux charges directes.",
              "Vérifiez que la marge brute se maintient au-dessus de votre seuil de rentabilité cible."
            ],
            successIndicator: "Tous les chiffres sont exprimés en dollars canadiens ($ CAD) arrondis pour une lisibilité exécutive immédiate.",
            tip: "En l'absence de grand livre bancaire complet, GESCOP calcule votre compte de résultat directement à partir de vos commandes et sommaires exécutifs."
          }
        ]
      },
      {
        id: "tresorerie",
        title: "Module Trésorerie & Prévisions de Flux",
        icon: Wallet,
        badge: "Liquidité",
        objective: "Protéger la pérennité financière en anticipant le solde bancaire et les engagements futurs.",
        content: [
          {
            h: "Action 1 : Piloter les flux de trésorerie réels",
            action: "Inspectez les mouvements de liquidités de la période :",
            steps: [
              "Vérifiez le Solde disponible actuel en banque.",
              "Examinez le flux net mensuel : Encaissements réels moins Décaissements réels.",
              "Consultez l'indicateur d'Autonomie financière (Cash Runway) indiquant le nombre de mois de fonctionnement sans nouveau revenu."
            ],
            successIndicator: "La courbe de trésorerie prévisionnelle projette votre solde sur les 3 prochains mois.",
            warning: "Si l'autonomie financière passe sous les 60 jours, une alerte critique est automatiquement émise."
          }
        ]
      },
      {
        id: "succursales",
        title: "Module Succursales & Multi-Points de Vente",
        icon: Building2,
        badge: "Réseau",
        objective: "Comparer la rentabilité et le volume de ventes entre vos magasins physiques et votre boutique Web.",
        content: [
          {
            h: "Action 1 : Évaluer la performance par succursale",
            action: "Détectez les écarts de rentabilité géographique :",
            steps: [
              "Consultez le tableau comparatif ventilant le Chiffre d'affaires, la Marge brute et le Panier moyen (AOV) par emplacement.",
              "Identifiez les succursales motrices (ex. Web, Lévis, Chicoutimi) et celles nécessitant un soutien commercial.",
              "Filtrez les résultats par succursale pour afficher un compte de résultat dédié à chaque point de vente."
            ],
            successIndicator: "Chaque succursale affiche sa contribution relative (%) au chiffre d'affaires global de l'entreprise."
          }
        ]
      },
      {
        id: "operations",
        title: "Clients, Produits, Stocks, RH & Fournisseurs",
        icon: Package,
        badge: "Opérations",
        objective: "Gérer l'ensemble des leviers opérationnels quotidiens pour éliminer les gaspillages.",
        content: [
          {
            h: "Action 1 : Piloter l'inventaire et les ruptures (Stocks)",
            action: "Évitez les ruptures de stock tout en limitant le capital immobilisé :",
            steps: [
              "Consultez la Valeur d'inventaire totale et le nombre d'unités physiques en entrepôt.",
              "Triez le tableau par statut pour isoler les articles en statut « Proche rupture » ou « Rupture ».",
              "Vérifiez les seuils de réapprovisionnement pour émettre les bons de commande fournisseurs à temps."
            ],
            successIndicator: "La valeur du stock dormant immobilisé est chiffrée en dollars CAD.",
            tip: "Un stock dormant depuis plus de 90 jours fait l'objet d'une recommandation automatique de déstockage ou promotion."
          },
          {
            h: "Action 2 : Segmenter la clientèle & lutter contre le churn (Clients)",
            action: "Identifiez les clients à forte valeur et ceux sur le point de partir :",
            steps: [
              "Consultez le Chiffre d'affaires consolidé et le panier moyen par client.",
              "Isolez le segment « Clients à risque » (inactifs depuis plus de 90 jours avec historique d'achat élevé).",
              "Exportez la liste ciblée pour déclencher une campagne marketing de réactivation."
            ],
            successIndicator: "Le taux d'attrition (churn) est mesuré mensuellement."
          },
          {
            h: "Action 3 : Mesurer la masse salariale et la productivité (RH)",
            action: "Contrôlez l'adéquation entre effectif et volume d'affaires :",
            steps: [
              "Consultez la Masse salariale globale (salaires fixes, horaires et commissions sur ventes).",
              "Vérifiez le ratio Masse salariale / Chiffre d'affaires (généralement entre 15% et 35% selon le secteur).",
              "Examinez le CA moyen généré par employé."
            ],
            successIndicator: "Chaque vendeur commissionné voit ses commissions calculées en direct sur les commandes enregistrées."
          },
          {
            h: "Action 4 : Suivre l'amortissement et la DPA fiscale (Immobilisations)",
            action: "Gérez vos actifs matériels, véhicules et bâtiments selon les normes fiscales canadiennes :",
            steps: [
              "Consultez le Coût d'acquisition brut (VBA) et la Valeur Nette Comptable (VNC) globale.",
              "Vérifiez le Taux de vétusté moyen du parc (Amortissements cumulés / Valeur brute).",
              "Consultez les classes fiscales de DPA (ex. Classe 1 pour bâtiments, Classe 0 pour terrains)."
            ],
            successIndicator: "La valeur de dépréciation annuelle déductible est calculée automatiquement pour votre bilan."
          }
        ]
      }
    ]
  },
  {
    label: "4. Intelligence & Aide à la décision",
    sections: [
      {
        id: "assistant",
        title: "Assistant GESCOP Analyst (CFO Conversationnel)",
        icon: MessageSquare,
        badge: "Analyste IA",
        objective: "Interroger vos données en langage naturel pour obtenir des recommandations d'affaires de niveau Direction Financière.",
        content: [
          {
            h: "Action 1 : Poser une question stratégique",
            action: "Formulez votre demande dans la barre de discussion :",
            steps: [
              "Accédez à l'onglet « Assistant » dans le menu de navigation.",
              "Cliquez sur une suggestion exécutive (ex. « Analyse la rentabilité de mes succursales » ou « Où puis-je économiser ? »), ou saisissez votre propre question.",
              "Appuyez sur la touche Entrée ou sur le bouton d'envoi."
            ],
            successIndicator: "L'assistant répond en 3 à 5 secondes avec une synthèse exécutive structurée et chiffrée."
          },
          {
            h: "Action 2 : Interpréter les badges de certification de réponse",
            action: "Comprenez le degré de certitude de chaque réponse apportée par l'analyste :",
            steps: [
              "🔵 Fait vérifié (FACT) : Donnée brute indiscutable extraite directement de vos fichiers importés.",
              "🟢 Calcul arithmétique (CALCULATION) : Résultat d'une formule mathématique rigoureuse appliquée aux données.",
              "🟣 Analyse déductive (INFERENCE) : Croisement logique de plusieurs indicateurs pour expliquer une cause.",
              "🟡 Hypothèse (HYPOTHESIS) : Piste explicative plausible nécessitant une vérification sur le terrain.",
              "🟢 Recommandation stratégique (RECOMMENDATION) : Plan d'action opérationnel préconisé avec impact chiffré en $ CAD."
            ],
            successIndicator: "L'indice de confiance (%) et la liste des sources exactes utilisées sont affichés au bas de chaque réponse."
          }
        ]
      },
      {
        id: "simulateur",
        title: "Simulateur d'Impact & Décisions Stratégiques",
        icon: Calculator,
        badge: "Scénarios",
        objective: "Simuler l'impact financier de vos décisions avant de les appliquer dans le monde réel.",
        content: [
          {
            h: "Action 1 : Tester un scénario de gestion",
            action: "Évaluez les conséquences d'un choix opérationnel :",
            steps: [
              "Rendez-vous dans la page « Simulateur ».",
              "Choisissez un levier : Hausse ou baisse des prix de vente (+5%), Embauche d'un nouvel employé, Réallocation du budget publicitaire.",
              "Visualisez immédiatement l'impact prévisionnel sur votre résultat net et sur votre trésorerie à 90 jours."
            ],
            successIndicator: "Un tableau comparatif Avant / Après chiffre le gain ou le risque net en dollars CAD."
          }
        ]
      }
    ]
  },
  {
    label: "5. Dépannage & FAQ",
    sections: [
      {
        id: "troubleshooting",
        title: "Guide de Dépannage Rapide (Troubleshooting)",
        icon: Wrench,
        badge: "Support",
        objective: "Résoudre instantanément les anomalies ou interrogations les plus fréquentes sans effort cognitif.",
        content: [
          {
            h: "Symptôme 1 : « Un module affiche un écran vide ou 0 $ »",
            action: "Résolution pas-à-pas en 3 étapes :",
            steps: [
              "Cause probable : Le fichier correspondant à ce module n'a pas encore été importé (ex. pas d'actifs importés pour Immobilisations).",
              "Solution : Rendez-vous sur la page « Importer » et déposez la feuille ou le fichier contenant ces données.",
              "Vérification : Dès la fin de l'import, rafraîchissez la page du module pour voir vos indicateurs calculés instantanément."
            ],
            successIndicator: "Les cartes de statistiques affichent les volumes réels consolidés."
          },
          {
            h: "Symptôme 2 : « Des colonnes sont signalées non reconnues lors de l'import »",
            action: "Résolution pas-à-pas :",
            steps: [
              "Cause probable : Votre en-tête utilise un libellé métier rare ou votre fichier comporte des cellules fusionnées.",
              "Solution 1 : Le Moteur V3 écarte automatiquement les colonnes fantômes vides (ex. col_7). Vous pouvez ignorer l'alerte si vos colonnes clés sont bien associées.",
              "Solution 2 : Si la colonne contient une donnée importante, cliquez sur le menu déroulant face au nom de la colonne et choisissez le champ cible.",
              "Solution 3 : Ajoutez l'équivalence dans le Dictionnaire de l'entreprise (Paramètres → Intelligence) pour que GESCOP s'en souvienne pour toujours."
            ],
            successIndicator: "La colonne est rattachée et ses valeurs sont intégrées dans la base de données."
          },
          {
            h: "Symptôme 3 : « L'Assistant IA répond que l'information n'est pas disponible »",
            action: "Résolution pas-à-pas :",
            steps: [
              "Cause probable : GESCOP applique une règle stricte de ZÉRO hallucination. Si une donnée n'est pas dans votre base, l'IA refuse d'inventer.",
              "Solution : Consultez la section « Sources » de l'assistant pour identifier le fichier manquant (ex. Dépenses, Fournisseurs ou Campagnes) et importez-le.",
              "Vérification : Reposez votre question : l'assistant cite immédiatement les nouveaux chiffres importés."
            ],
            successIndicator: "L'assistant produit une réponse chiffrée avec badge « Fait vérifié » ou « Calcul arithmétique »."
          },
          {
            h: "Symptôme 4 : « Les montants financiers diffèrent entre l'écran d'accueil et le rapport annuel »",
            action: "Comprendre les fenêtres temporelles :",
            steps: [
              "Fenêtre par défaut : Le tableau de bord et les cartes de synthèse affichent par défaut une fenêtre récente (ex. 3 derniers mois) pour refléter la dynamique actuelle.",
              "Fenêtre consolidée : Les rapports d'audit et les totaux globaux agrègent l'ensemble de l'historique importé.",
              "Solution : Utilisez le sélecteur de période situé en haut de page pour aligner les plages de dates comparées."
            ],
            successIndicator: "Les totaux coïncident au dollar près sur la période sélectionnée."
          }
        ]
      }
    ]
  }
];

// Flatten for lookup
const allSections = groups.flatMap((g) => g.sections);

export default function Manuel() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const firstSectionId = groups[0]?.sections[0]?.id || "perimetre";
  const [activeSection, setActiveSection] = useState(firstSectionId);

  return (
    <div className="space-y-8">
      {/* En-tête officiel / Page de garde */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="flex items-center gap-4">
            <BrandLogo className="h-14 w-14 shrink-0 rounded-2xl border border-border shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/25">
                  Documentation Officielle
                </span>
                <span className="text-xs font-semibold text-muted-foreground">Version 2.4 · Septembre 2026</span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Manuel de Pilotage & Guide d'Utilisation
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Système d'Intelligence Stratégique & Contrôle de Gestion pour PME Canadiennes & Québécoises
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-border bg-background px-3 py-2 text-right">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Devise standard</p>
              <p className="text-sm font-bold text-foreground">$ CAD</p>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-2 text-right">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Conformité</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> Loi 25 QC
              </p>
            </div>
          </div>
        </div>

        {/* Fiche de cadrage rapide (Objectif, Cible, Méthode) */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
            <div className="flex items-center gap-2 font-bold text-foreground mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span>Objectif Unique</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Amener le gestionnaire à l'autonomie totale pour importer ses données, suivre ses marges et piloter son entreprise sans effort cognitif.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
            <div className="flex items-center gap-2 font-bold text-foreground mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span>Public Cible</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Dirigeants (CEO), Directeurs Financiers (CFO), Contrôleurs de gestion et Gestionnaires d'opérations de PME (tous niveaux).
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
            <div className="flex items-center gap-2 font-bold text-foreground mb-1">
              <Brain className="h-4 w-4 text-primary" />
              <span>Règle Zéro Hallucination</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              100 % des chiffres et recommandations sont mathématiquement étayés par vos données réelles importées.
            </p>
          </div>
        </div>
      </div>

      {/* Corps du manuel : Sommaire dynamique à gauche, Contenu à droite */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sommaire interactif sticky */}
        <aside className="lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="flex items-center justify-between lg:block">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Table des matières
              </p>
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium lg:hidden"
              >
                <span>Naviguer</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mobileNavOpen && "rotate-180")} />
              </button>
            </div>

            <div className={cn(mobileNavOpen ? "block" : "hidden lg:block")}>
              <ManualTableOfContents groups={groups} onActiveSectionChange={setActiveSection} />
            </div>
          </div>
        </aside>

        {/* Contenu textuel et visuel orienté action */}
        <div className="min-w-0 flex-1 max-w-4xl space-y-10">
          {allSections.map((s, idx) => (
            <section
              key={s.id}
              id={`section-${s.id}`}
              className="scroll-mt-6 rounded-3xl border border-border bg-card p-6 sm:p-9 shadow-sm"
            >
              {/* En-tête de section */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{s.title}</h2>
                    {s.objective && (
                      <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="font-semibold text-foreground/80">Mission :</span> {s.objective}
                      </p>
                    )}
                  </div>
                </div>
                {s.badge && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground border border-border">
                    {s.badge}
                  </span>
                )}
              </div>

              {/* Blocs d'actions chronologiques */}
              <div className="mt-6 space-y-8">
                {s.content.map((block, i) => (
                  <div key={i} id={`heading-${s.id}-${i}`} className="scroll-mt-20 space-y-3">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                        {i + 1}
                      </span>
                      {block.h}
                    </h3>

                    {block.action && (
                      <p className="text-sm font-medium text-foreground/90 pl-8">
                        {block.action}
                      </p>
                    )}

                    {block.steps && block.steps.length > 0 && (
                      <div className="pl-8 space-y-2">
                        {block.steps.map((st, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span className="leading-relaxed">{st}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Indicateur de succès explicite (Règle d'or #3) */}
                    {block.successIndicator && (
                      <div className="ml-8 mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Indicateur de succès :</span>
                          <span>{block.successIndicator}</span>
                        </div>
                      </div>
                    )}

                    {/* Astuce / Conseil pratique */}
                    {block.tip && (
                      <div className="ml-8 mt-2 flex items-start gap-2.5 rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-300">
                        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Conseil d'expert :</span>
                          <span>{block.tip}</span>
                        </div>
                      </div>
                    )}

                    {/* Avertissement critique */}
                    {block.warning && (
                      <div className="ml-8 mt-2 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Point de vigilance critique :</span>
                          <span>{block.warning}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Pied de page du guide */}
          <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Une interrogation sur vos données ?</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              L'Assistant GESCOP Analyst est disponible en permanence dans le menu latéral pour inspecter vos chiffres et simuler vos scénarios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
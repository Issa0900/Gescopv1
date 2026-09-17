import React from "react";
import { Shield, FileLock2, Eye, Trash2, Share2, Lock, Globe, Bot, Mail, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  {
    id: "responsable",
    icon: Shield,
    title: "1. Responsable de la protection des renseignements personnels",
    content: [
      "Conformément à la Loi 25 (Loi modernisant des dispositions législatives en matière de protection des renseignements personnels, Québec), GESCOP désigne un responsable de la protection des renseignements personnels.",
      "Pour toute question, demande d'accès, de correction ou de retrait de consentement concernant vos renseignements personnels, vous pouvez communiquer avec le responsable :",
      "• Par courriel : privacy@gescop.app (à titre indicatif - remplacez par l'adresse officielle de votre organisation)",
      "• Le responsable s'engage à accuser réception de votre demande dans les 30 jours suivant sa réception, conformément à la loi.",
    ],
  },
  {
    id: "collecte",
    icon: FileLock2,
    title: "2. Renseignements personnels collectés",
    content: [
      "GESCOP collecte les catégories de renseignements personnels suivantes :",
      "• Renseignements d'identification : nom, prénom, adresse courriel, mot de passe (chiffré), rôle dans l'organisation.",
      "• Renseignements d'entreprise : nom de l'entreprise, secteur d'activité, localisation, nombre d'employés, chiffre d'affaires, site web, modèle d'affaires, produits, services, clientèle, fournisseurs, outils utilisés, objectifs stratégiques.",
      "• Données opérationnelles et financières importées : transactions, commandes, clients, produits, stocks, campagnes marketing, flux de trésorerie, dépenses, employés, paie, fournisseurs, concurrents, interactions client, achats, événements, objectifs.",
      "• Données d'analyse générées : anomalies, risques, opportunités, recommandations, KPI, prévisions, rapports, alertes, signaux externes.",
      "• Données techniques : journal d'audit des imports, horodatage des analyses, journaux de connexion.",
    ],
  },
  {
    id: "finalites",
    icon: Eye,
    title: "3. Finalités de la collecte",
    content: [
      "Les renseignements personnels sont collectés aux fins suivantes :",
      "• Fournir le service de pilotage, d'anticipation et d'aide à la décision stratégique pour votre PME.",
      "• Analyser vos données financières et opérationnelles pour détecter des anomalies, évaluer des risques, identifier des opportunités et générer des recommandations actionnables.",
      "• Générer des rapports, prévisions et indicateurs de performance (KPI) à partir de vos données.",
      "• Alimenter l'Assistant IA qui répond à vos questions en langage naturel sur votre entreprise.",
      "• Surveiller l'environnement externe (marché, économie, concurrence) via le radar externe.",
      "• Assurer la sécurité, l'intégrité et la traçabilité du système (journal d'audit).",
      "• Améliorer la qualité et la pertinence des analyses produites par le système.",
    ],
  },
  {
    id: "consentement",
    icon: Shield,
    title: "4. Consentement",
    content: [
      "Conformément à la Loi 25, le consentement à la collecte, à l'utilisation et à la communication de vos renseignements personnels doit être libre, éclairé et donné à des fins spécifiques.",
      "• En créant un compte et en utilisant GESCOP, vous consentez à la collecte et à l'utilisation de vos renseignements personnels aux finalités décrites à la section 3.",
      "• Le consentement peut être retiré à tout moment. Le retrait de consentement n'a pas d'effet rétroactif sur les utilisations déjà effectuées.",
      "• Vous pouvez retirer votre consentement en supprimant votre compte ou en contactant le responsable de la protection des renseignements personnels.",
    ],
  },
  {
    id: "partage",
    icon: Share2,
    title: "5. Partage et communication à des tiers",
    content: [
      "GESCOP ne vend, ne loue et n'échange jamais vos renseignements personnels avec des tiers à des fins commerciales.",
      "Vos renseignements personnels peuvent être communiqués uniquement dans les cas suivants :",
      "• À des fournisseurs de services technologiques nécessaires au fonctionnement de la plateforme (hébergement cloud, infrastructure) - ces fournisseurs sont soumis à des ententes de confidentialité et sont tenus de protéger vos données conformément à la Loi 25.",
      "• Lorsqu'une loi l'exige ou en réponse à une demande valide d'une autorité gouvernementale ou judiciaire.",
      "• En cas de fusion, acquisition ou vente d'actifs, sous réserve de notification préalable et du maintien des protections de confidentialité.",
      "• À un mandataire (tiers autorisé) uniquement avec votre consentement explicite et pour une fin spécifique que vous avez autorisée.",
    ],
  },
  {
    id: "securite",
    icon: Lock,
    title: "6. Mesures de sécurité",
    content: [
      "GESCOP met en œuvre des mesures de sécurité techniques, organisationnelles et physiques pour protéger vos renseignements personnels contre l'accès non autorisé, la modification, la divulgation ou la destruction :",
      "• Chiffrement des données au repos et en transit (chiffrement TLS/SSL pour toutes les communications).",
      "• Isolation par organisation : vos données sont séparées de celles des autres utilisateurs. Aucun utilisateur ne peut accéder aux données d'une autre organisation.",
      "• Authentification sécurisée avec gestion des sessions et des jetons d'accès.",
      "• Journal d'audit complet des imports et des analyses pour assurer la traçabilité.",
      "• Contrôle d'accès basé sur les rôles (administrateur, utilisateur).",
      "• Évaluation de sécurité et de confidentialité en cas d'incident de confidentialité (obligation de la Loi 25).",
    ],
  },
  {
    id: "hebergement",
    icon: Globe,
    title: "7. Hébergement et transfert hors du Québec",
    content: [
      "Vos données sont hébergées au Canada, conformément aux exigences de la Loi 25.",
      "• L'infrastructure d'hébergement est située au Canada pour garantir la conformité avec les lois québécoises et canadiennes sur la protection des données.",
      "• Si une partie des données devait être traitée hors du Québec, GESCOP s'assurerait que le destinataire offre une protection équivalente à celle prévue par la Loi 25, notamment par le biais d'ententes contractuelles appropriées ou en vérifiant que la juridiction de destination offre une protection adéquate.",
    ],
  },
  {
    id: "retention",
    icon: Trash2,
    title: "8. Conservation et destruction des renseignements",
    content: [
      "Conformément à la Loi 25, GESCOP conserve vos renseignements personnels uniquement pendant la durée nécessaire à la réalisation des finalités pour lesquelles ils ont été collectés, ou selon les délais légaux applicables.",
      "• Données de compte : conservées tant que votre compte est actif. Supprimées dans les 30 jours suivant la suppression du compte.",
      "• Données importées (transactions, commandes, etc.) : conservées tant que vous utilisez le service. Supprimées dans les 30 jours suivant la suppression de votre compte ou à votre demande explicite.",
      "• Rapports et analyses générés : conservés tant que votre compte est actif. Supprimés avec le compte.",
      "• Journaux d'audit : conservés 12 mois à des fins de traçabilité, puis détruits de manière sécurisée.",
      "• À la fin de la période de conservation, les renseignements sont détruits, anonymisés ou rendus anonymes de manière sécurisée.",
    ],
  },
  {
    id: "droits",
    icon: Eye,
    title: "9. Vos droits",
    content: [
      "Conformément à la Loi 25, vous disposez des droits suivants concernant vos renseignements personnels :",
      "• Droit d'accès : vous pouvez demander l'accès aux renseignements personnels que GESCOP détient à votre sujet.",
      "• Droit de correction : vous pouvez demander la correction d'un renseignement personnel inexact, incomplet ou équivoque.",
      "• Droit de retrait de consentement : vous pouvez retirer votre consentement à l'utilisation ou à la communication de vos renseignements personnels.",
      "• Droit à la portabilité : vous pouvez demander une copie de vos renseignements personnels dans un format structuré et couramment utilisé.",
      "• Droit à l'effacement : vous pouvez demander la suppression de vos renseignements personnels, sous réserve des obligations légales de conservation.",
      "• Droit d'être informé en cas d'incident de confidentialité : GESCOP s'engage à vous informer de tout incident de confidentialité présentant un risque de préjudice sérieux, conformément à la Loi 25.",
      "Pour exercer ces droits, contactez le responsable de la protection des renseignements personnels. GESCOP s'engage à répondre à votre demande dans les 30 jours.",
    ],
  },
  {
    id: "automatisee",
    icon: Bot,
    title: "10. Décisions automatisées et intelligence artificielle",
    content: [
      "GESCOP utilise l'intelligence artificielle pour analyser vos données et générer des anomalies, risques, opportunités, recommandations, prévisions et rapports.",
      "• Conformément à la Loi 25, vous avez le droit d'être informé de l'utilisation de l'IA pour prendre ou appuyer une décision basée exclusivement sur un traitement automatisé de vos renseignements personnels.",
      "• Les recommandations et analyses produites par GESCOP sont des outils d'aide à la décision. Elles ne constituent pas des décisions finales. La décision finale appartient toujours au dirigeant de l'entreprise.",
      "• Vous pouvez contester toute recommandation ou analyse produite par l'IA en contactant le responsable de la protection des renseignements personnels.",
      "• GESCOP s'engage à fournir des explications sur les critères et les données utilisés pour produire ses analyses, sur demande.",
    ],
  },
  {
    id: "cookies",
    icon: Globe,
    title: "11. Cookies et technologies de suivi",
    content: [
      "GESCOP utilise des cookies et technologies similaires uniquement pour le fonctionnement technique de l'application :",
      "• Cookies de session : nécessaires à l'authentification et au maintien de votre session sécurisée.",
      "• GESCOP n'utilise pas de cookies publicitaires ou de suivi tiers à des fins commerciales.",
      "• Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela peut affecter le fonctionnement de l'application.",
    ],
  },
  {
    id: "incident",
    icon: Shield,
    title: "12. Notification en cas d'incident de confidentialité",
    content: [
      "Conformément à la Loi 25, GESCOP est tenue de prendre des mesures raisonnables pour diminuer les risques qu'un incident de confidentialité cause un préjudice sérieux aux personnes concernées.",
      "• En cas d'incident de confidentialité présentant un risque de préjudice sérieux, GESCOP avise la Commission d'accès à l'information du Québec (CAI) et les personnes concernées.",
      "• L'avis inclut : une description des renseignements personnels concernés, une description des circonstances de l'incident, les mesures prises ou prévues pour diminuer les risques de préjudice, et les mesures que vous pouvez prendre pour vous protéger.",
    ],
  },
  {
    id: "plainte",
    icon: Mail,
    title: "13. Plainte et recours",
    content: [
      "Si vous estimez que GESCOP n'a pas respecté ses obligations en matière de protection des renseignements personnels, vous pouvez :",
      "• Déposer une plainte auprès du responsable de la protection des renseignements personnels de GESCOP.",
      "• Déposer une plainte auprès de la Commission d'accès à l'information du Québec (CAI) :",
      "   - Site web : access.gouv.qc.ca",
      "   - Téléphone : 1 877 353-0434 (sans frais)",
      "   - Courriel : plaintes@access.gouv.qc.ca",
      "• GESCOP s'engage à coopérer pleinement avec la CAI dans le traitement de toute plainte.",
    ],
  },
  {
    id: "modifications",
    icon: FileLock2,
    title: "14. Modifications de la politique",
    content: [
      "GESCOP se réserve le droit de modifier la présente politique de confidentialité à tout moment pour refléter les changements dans ses pratiques, les exigences légales ou les recommandations de la CAI.",
      "• Les modifications entrent en vigueur dès leur publication dans l'application.",
      "• En cas de modification importante, GESCOP vous informera par notification dans l'application ou par courriel.",
      "• La date de la dernière mise à jour est indiquée en haut de cette page.",
    ],
  },
];

export default function PolitiqueConfidentialite() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Politique de confidentialité</h1>
            <p className="mt-1 text-sm text-muted-foreground">Conforme à la Loi 25 (Québec) - Protection des renseignements personnels</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          GESCOP s'engage à protéger les renseignements personnels de ses utilisateurs conformément à la
          <span className="font-medium text-foreground"> Loi modernisant des dispositions législatives en matière de protection des renseignements personnels</span> (Loi 25) du Québec. Cette politique décrit comment nous collectons, utilisons, partageons et protégeons vos renseignements personnels.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Dernière mise à jour : 11 septembre 2026</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Table des matières</p>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary/50" />
              {s.title.replace(/^\d+\.\s/, "")}
            </a>
          ))}
        </div>
      </div>

      {sections.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <s.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <h2 className="text-base font-bold tracking-tight">{s.title.replace(/^\d+\.\s/, "")}</h2>
          </div>
          <div className="space-y-2.5 pl-1">
            {s.content.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Pour toute question concernant cette politique, contactez le responsable de la protection des renseignements personnels.
        </p>
        <Link to="/parametres" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Retour aux paramètres <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
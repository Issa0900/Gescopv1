import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Insights = lazy(() => import('@/pages/Insights'));
const Previsions = lazy(() => import('@/pages/Previsions'));
const Simulateur = lazy(() => import('@/pages/Simulateur'));
const Decisions = lazy(() => import('@/pages/Decisions'));
const Historique = lazy(() => import('@/pages/Historique'));
const ImportPage = lazy(() => import('@/pages/Import'));
const Kpis = lazy(() => import('@/pages/Kpis'));
const Anomalies = lazy(() => import('@/pages/Anomalies'));
const Risques = lazy(() => import('@/pages/Risques'));
const Recommandations = lazy(() => import('@/pages/Recommandations'));
const Radar = lazy(() => import('@/pages/Radar'));
const Taches = lazy(() => import('@/pages/Taches'));
const Alertes = lazy(() => import('@/pages/Alertes'));
const Rapports = lazy(() => import('@/pages/Rapports'));
const Assistant = lazy(() => import('@/pages/Assistant'));
const Parametres = lazy(() => import('@/pages/Parametres'));
const Manuel = lazy(() => import('@/pages/Manuel'));
const PolitiqueConfidentialite = lazy(() => import('@/pages/PolitiqueConfidentialite'));
const Clients = lazy(() => import('@/pages/Clients'));
const Produits = lazy(() => import('@/pages/Produits'));
const Marketing = lazy(() => import('@/pages/Marketing'));
const Tresorerie = lazy(() => import('@/pages/Tresorerie'));
const Finance = lazy(() => import('@/pages/Finance'));
const RessourcesHumaines = lazy(() => import('@/pages/RessourcesHumaines'));
const Audit = lazy(() => import('@/pages/Audit'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Render the main app
  // Les 29 pages etaient importees statiquement : recharts, framer-motion et
  // l'ensemble des ecrans etaient telecharges avant le premier affichage.
  const chargement = (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
    </div>
  );

  return (
    <Suspense fallback={chargement}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/previsions" element={<Previsions />} />
          <Route path="/simulateur" element={<Simulateur />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/historique" element={<Historique />} />
          <Route path="/importer" element={<ImportPage />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/produits" element={<Produits />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/rh" element={<RessourcesHumaines />} />
          <Route path="/tresorerie" element={<Tresorerie />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/kpis" element={<Kpis />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/risques" element={<Risques />} />
          <Route path="/recommandations" element={<Recommandations />} />
          <Route path="/radar" element={<Radar />} />
          <Route path="/taches" element={<Taches />} />
          <Route path="/alertes" element={<Alertes />} />
          <Route path="/rapports" element={<Rapports />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="/manuel" element={<Manuel />} />
          <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ErrorBoundary>
            <ScrollToTop />
            <AuthenticatedApp />
          </ErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import { useAuth } from "./_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PageTransitionProvider } from "./contexts/PageTransitionContext";
import { NexusProvider, useNexus } from "./contexts/NexusContext";
import { CustomCursor } from "./components/CortexShell";
import Home from "./pages/Home";
import Arquivo from "./pages/Arquivo";
import Nexus from "./pages/Nexus";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import AgentProfile from "./pages/AgentProfile";
import Verso from "./pages/Verso";
import Forma from "./pages/Forma";
import FormaDetail from "./pages/FormaDetail";
import FormaBriefing from "./pages/FormaBriefing";
import Sobre from "./pages/Sobre";
import SplashScreen, { useSplashScreen } from "./components/SplashScreen";
import RankUpOverlay from "./components/RankUpOverlay";
import AchievementToastContainer from "./components/AchievementToast";

// ─── Public route detection ───────────────────────────────────────────────────
// Routes listed here are rendered WITHOUT NexusProvider to avoid protectedProcedure
// calls from triggering the global auth redirect handler.
const PUBLIC_PATH_PREFIXES = ["/b/", "/sobre"];
const PUBLIC_PATH_EXACT = ["/"]; // "/" is handled by HomeGate (no Nexus needed)

function isPublicRoute(path: string): boolean {
  if (PUBLIC_PATH_EXACT.includes(path)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// ─── HomeGate ────────────────────────────────────────────────────────────────
// Runs OUTSIDE NexusProvider (no protectedProcedure calls).
// • Not authenticated → show /sobre (public presentation page)
// • Authenticated     → redirect to /landing (Home inside NexusProvider)
function HomeGate() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Redirect to="/sobre" />;
  // Redirect to /landing so Home renders inside NexusProvider
  return <Redirect to="/landing" />;
}

// ─── Authenticated Router (inside NexusProvider) ─────────────────────────────
function Router() {
  return (
    <Switch>
      {/* /landing is the authenticated home — same component as Home */}
      <Route path={"/landing"} component={Home} />
      <Route path={"/arquivo"} component={Arquivo} />
      <Route path={"/arquivo/:id"} component={Arquivo} />
      <Route path={"/nexus"} component={Nexus} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/login"} component={Login} />
      <Route path={"/agente/:id"} component={AgentProfile} />
      <Route path={"/verso"} component={Verso} />
      <Route path={"/forma"} component={Forma} />
      <Route path={"/forma/:id"} component={FormaDetail} />
      <Route path={"/sobre"} component={Sobre} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const { show, dismiss } = useSplashScreen();
  const { rankUpEvent, clearRankUpEvent } = useNexus();
  return (
    <>
      {/* CustomCursor global — cobre todas as rotas autenticadas */}
      <CustomCursor />
      {show && <SplashScreen onDone={dismiss} />}
      {rankUpEvent && (
        <RankUpOverlay
          show={!!rankUpEvent}
          rankName={rankUpEvent.rankName}
          rankColor={rankUpEvent.rankColor}
          onDone={clearRankUpEvent}
        />
      )}
      <AchievementToastContainer />
      <PageTransitionProvider>
        <Toaster />
        <Router />
      </PageTransitionProvider>
    </>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
function App() {
  const [location] = useLocation();

  // Public routes: /, /sobre, /b/* — rendered without NexusProvider
  if (isPublicRoute(location)) {
    return (
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            {/* CustomCursor global — cobre /sobre e /b/:token */}
            <CustomCursor />
            <Toaster />
            <Switch>
              <Route path={"/"} component={HomeGate} />
              <Route path={"/b/:token"} component={FormaBriefing} />
              <Route path={"/sobre"} component={Sobre} />
              <Route component={NotFound} />
            </Switch>
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  // Authenticated routes — inside NexusProvider
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <NexusProvider>
          <TooltipProvider>
            <AppInner />
          </TooltipProvider>
        </NexusProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

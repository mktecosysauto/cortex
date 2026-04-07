import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import { useAuth } from "./_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PageTransitionProvider } from "./contexts/PageTransitionContext";
import { NexusProvider, useNexus } from "./contexts/NexusContext";
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
// Routes here are rendered WITHOUT NexusProvider to avoid protectedProcedure
// calls from triggering the global auth redirect handler.
const PUBLIC_PATH_PREFIXES = ["/b/", "/sobre"];
const PUBLIC_PATH_EXACT = ["/"];

function isPublicRoute(path: string): boolean {
  if (PUBLIC_PATH_EXACT.includes(path)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// ─── HomeGate: runs outside NexusProvider ────────────────────────────────────
// Only performs a redirect decision — never renders components that need Nexus.
// Non-authenticated → /sobre (public presentation page)
// Authenticated → /dashboard (enters the full authenticated app)
function HomeGate() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Redirect to="/sobre" />;
  return <Redirect to="/dashboard" />;
}

// ─── Router (authenticated, inside NexusProvider) ────────────────────────────
function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/arquivo"} component={Arquivo} />
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
// Public routes (/, /sobre, /b/*) are rendered completely isolated from
// NexusProvider. "/" only runs HomeGate which does a redirect — no Nexus needed.
// Authenticated routes go through NexusProvider normally.
function App() {
  const [location] = useLocation();

  if (isPublicRoute(location)) {
    return (
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
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

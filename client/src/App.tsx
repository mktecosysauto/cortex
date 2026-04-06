import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
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
import SplashScreen, { useSplashScreen } from "./components/SplashScreen";
import RankUpOverlay from "./components/RankUpOverlay";
import AchievementToastContainer from "./components/AchievementToast";

// ─── Public routes that must NOT trigger auth redirect ────────────────────────
const PUBLIC_PATHS = ["/b/"];

function isPublicRoute(path: string): boolean {
  return PUBLIC_PATHS.some((prefix) => path.startsWith(prefix));
}

// ─── Router ───────────────────────────────────────────────────────────────────
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

// ─── App root: separates public routes from authenticated app ─────────────────
function App() {
  const [location] = useLocation();

  // Public route: render FormaBriefing completely isolated, without NexusProvider
  // This prevents the protectedProcedure getProfile call from firing and
  // triggering the global redirectToLoginIfUnauthorized handler.
  if (isPublicRoute(location)) {
    return (
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Switch>
              <Route path={"/b/:token"} component={FormaBriefing} />
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

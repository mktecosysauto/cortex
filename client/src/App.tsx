import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PageTransitionProvider } from "./contexts/PageTransitionContext";
import { NexusProvider } from "./contexts/NexusContext";
import PulsoWidget from "./components/PulsoWidget";
import Home from "./pages/Home";
import Arquivo from "./pages/Arquivo";
import Nexus from "./pages/Nexus";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/arquivo"} component={Arquivo} />
      <Route path={"/nexus"} component={Nexus} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <NexusProvider>
          <TooltipProvider>
            <PageTransitionProvider>
              <Toaster />
              <Router />
              <PulsoWidget />
            </PageTransitionProvider>
          </TooltipProvider>
        </NexusProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

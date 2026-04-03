import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PageTransitionProvider } from "./contexts/PageTransitionContext";
import Home from "./pages/Home";
import Arquivo from "./pages/Arquivo";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/arquivo"} component={Arquivo} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          {/* PageTransitionProvider must be inside Router context (wouter) */}
          <PageTransitionProvider>
            <Toaster />
            <Router />
          </PageTransitionProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

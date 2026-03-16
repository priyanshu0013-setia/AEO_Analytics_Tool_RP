import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/layout";
import { CampaignsList } from "@/pages/campaigns-list";
import { NewCampaign } from "@/pages/new-campaign";
import { RunCampaign } from "@/pages/run-campaign";
import { CampaignReport } from "@/pages/campaign-report";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000 * 60,
    }
  }
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={CampaignsList} />
        <Route path="/campaigns/new" component={NewCampaign} />
        <Route path="/campaigns/:id/run" component={RunCampaign} />
        <Route path="/campaigns/:id/report" component={CampaignReport} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

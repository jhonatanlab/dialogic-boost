import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inbox from "./pages/Inbox";
import Contacts from "./pages/Contacts";
import CRM from "./pages/CRM";
import Automations from "./pages/Automations";
import Campaigns from "./pages/Campaigns";
import NewCampaign from "./pages/NewCampaign";
import NewMessageTemplate from "./pages/NewMessageTemplate";
import Analytics from "./pages/Analytics";
import CheckIn from "./pages/CheckIn";
import PublicCheckIn from "./pages/PublicCheckIn";
import Agenda from "./pages/Agenda";


import NotFound from "./pages/NotFound";
import ModeloMessages from "./pages/ModeloMessages";
import Settings from "./pages/Settings";
import WhatsappIntegrations from "./pages/WhatsappIntegrations";
import WebhookIntegrations from "./pages/WebhookIntegrations";
import AdminWhatsapp from "./pages/AdminWhatsapp";
import AdminCompanies from "./pages/AdminCompanies";
import Users from "./pages/Users";
import Teams from "./pages/Teams";
import CompanyProfile from "./pages/CompanyProfile";
import ChatDistribution from "./pages/ChatDistribution";
import Profile from "./pages/Profile";
import ClosureReasons from "./pages/ClosureReasons";
import AppointmentRules from "./pages/AppointmentRules";
import AgentAI from "./pages/AgentAI";
import Inverters from "./pages/propostas/Inverters";
import Modules from "./pages/propostas/Modules";
import Kits from "./pages/propostas/Kits";
import ProposalSettings from "./pages/propostas/Settings";
import ProposalFinancing from "./pages/propostas/Financing";
import ProposalFixedValues from "./pages/propostas/FixedValues";
import ProposalBranding from "./pages/propostas/Branding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/new" element={<NewCampaign />} />
          <Route path="/message-templates/new" element={<NewMessageTemplate />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/analytics" element={<Analytics />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/checkin/:urlToken" element={<PublicCheckIn />} />
            
          
          <Route path="/modelo-messages" element={<ModeloMessages />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/whatsapp-integrations" element={<WhatsappIntegrations />} />
          <Route path="/settings/webhook-integrations" element={<WebhookIntegrations />} />
          <Route path="/settings/users" element={<Users />} />
          <Route path="/settings/teams" element={<Teams />} />
          <Route path="/settings/company" element={<CompanyProfile />} />
          <Route path="/settings/distribution" element={<ChatDistribution />} />
          <Route path="/settings/closure-reasons" element={<ClosureReasons />} />
          <Route path="/settings/appointment-rules" element={<AppointmentRules />} />
          <Route path="/agent-ai" element={<AgentAI />} />
          <Route path="/propostas" element={<Navigate to="/propostas/kits" replace />} />
          <Route path="/propostas/inversores" element={<Inverters />} />
          <Route path="/propostas/modulos" element={<Modules />} />
          <Route path="/propostas/kits" element={<Kits />} />
          <Route path="/propostas/configuracoes" element={<ProposalSettings />} />
          <Route path="/propostas/configuracoes/financiamento" element={<ProposalFinancing />} />
          <Route path="/propostas/configuracoes/valores-fixos" element={<ProposalFixedValues />} />
          <Route path="/propostas/configuracoes/personalizacao" element={<ProposalBranding />} />
          <Route path="/admin/whatsapp" element={<AdminWhatsapp />} />
          <Route path="/admin/companies" element={<AdminCompanies />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

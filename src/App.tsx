import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import CookieConsent from "@/components/CookieConsent";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PersonaQuiz from "./pages/PersonaQuiz";
import StudyLogs from "./pages/StudyLogs";
import StudyLogForm from "./pages/StudyLogForm";
import Leaderboard from "./pages/Leaderboard";
import WeeklyGoalsHistory from "./pages/WeeklyGoalsHistory";
import AdminPanel from "./pages/AdminPanel";
import UniversitySignup from "./pages/UniversitySignup";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AccountSettings from "./pages/AccountSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/persona-quiz" element={<PersonaQuiz />} />
            <Route path="/study-logs" element={<StudyLogs />} />
            <Route path="/study-logs/new" element={<StudyLogForm />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/weekly-goals" element={<WeeklyGoalsHistory />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/university-signup" element={<UniversitySignup />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

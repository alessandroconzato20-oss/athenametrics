import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import CookieConsent from "@/components/CookieConsent";
import GdprPrivacySheet from "@/components/GdprPrivacySheet";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Welcome from "./pages/Welcome";
import PersonaQuiz from "./pages/PersonaQuiz";
import ChronotypeQuiz from "./pages/ChronotypeQuiz";
import StudyLogs from "./pages/StudyLogs";
import StudyLogForm from "./pages/StudyLogForm";
import StudyTimer from "./pages/StudyTimer";
import Leaderboard from "./pages/Leaderboard";
import WeeklyGoalsHistory from "./pages/WeeklyGoalsHistory";
import AdminPanel from "./pages/AdminPanel";
import ProfessorPanel from "./pages/ProfessorPanel";
import UniversitySignup from "./pages/UniversitySignup";
import UniversityLogin from "./pages/UniversityLogin";
import UniversitySetup from "./pages/UniversitySetup";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AccountSettings from "./pages/AccountSettings";
import NotFound from "./pages/NotFound";

// Dev-only: algorithm tuning playground. Tree-shaken out of production.
const AlgorithmPlayground = import.meta.env.DEV
  ? (await import("./pages/dev/AlgorithmPlayground")).default
  : null;

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
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/persona-quiz" element={<PersonaQuiz />} />
            <Route path="/quiz/chronotype" element={<ChronotypeQuiz />} />
            <Route path="/study-logs" element={<StudyLogs />} />
            <Route path="/study-logs/new" element={<StudyLogForm />} />
            <Route path="/study-timer" element={<StudyTimer />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/weekly-goals" element={<WeeklyGoalsHistory />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/professor" element={<ProfessorPanel />} />
            <Route path="/university-login" element={<UniversityLogin />} />
            <Route path="/university-signup" element={<UniversitySignup />} />
            <Route path="/university-setup" element={<UniversitySetup />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/account" element={<AccountSettings />} />
            {AlgorithmPlayground && (
              <Route path="/dev/algorithms" element={<AlgorithmPlayground />} />
            )}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <GdprPrivacySheet />
          <CookieConsent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

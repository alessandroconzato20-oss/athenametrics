import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import athenaLogo from "@/assets/athena-logo.png";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [year, setYear] = useState("");
  const [matricola, setMatricola] = useState("");
  const [cohortCode, setCohortCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "valid"; university: string; year: number | null; label: string | null }
    | { state: "invalid" }
  >({ state: "idle" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Live-validate the cohort code with debounce
  useState(() => {});
  const onCodeChange = (raw: string) => {
    const v = raw.toUpperCase().replace(/\s+/g, "").slice(0, 16);
    setCohortCode(v);
    if (v.length < 4) { setCodeStatus({ state: "idle" }); return; }
    setCodeStatus({ state: "checking" });
    const checked = v;
    setTimeout(async () => {
      if (checked !== v) return;
      const { data, error } = await supabase.rpc("validate_cohort_code" as any, { _code: checked });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.valid) { setCodeStatus({ state: "invalid" }); return; }
      setCodeStatus({ state: "valid", university: row.university_name, year: row.year, label: row.label });
      if (row.year && !year) setYear(String(row.year));
    }, 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeStatus.state !== "valid") { toast.error("Please enter a valid institution code"); return; }
    if (!year) { toast.error("Please select your year"); return; }
    if (!consentGiven) { toast.error("You must agree to the Privacy Policy and Terms of Service"); return; }
    setIsLoading(true);
    try {
      await signUp(email, password, name, parseInt(year), matricola, cohortCode);

      // Log consent after signup (best-effort, user may not be authed yet)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from("consent_logs").insert([
            { user_id: session.user.id, consent_type: "privacy_policy" },
            { user_id: session.user.id, consent_type: "terms_of_service" },
          ]);
        }
      } catch {
        // Consent logging is best-effort during signup
      }

      toast.success("Account created! Check your email to verify, then sign in.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      {/* Decorative logo watermarks */}
      <img
        src={athenaLogo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute -left-32 top-32 h-72 w-72 opacity-[0.07] object-contain hidden md:block"
      />
      <img
        src={athenaLogo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute -left-20 bottom-8 h-64 w-64 opacity-[0.07] object-contain hidden md:block"
      />
      <img
        src={athenaLogo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute -right-28 top-10 h-80 w-80 opacity-[0.07] object-contain hidden md:block"
      />
      <img
        src={athenaLogo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute -right-24 bottom-32 h-72 w-72 opacity-[0.07] object-contain hidden md:block"
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <motion.img
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.15 }}
            src={athenaLogo}
            alt="Athena Metrics"
            className="mb-6 h-20 w-20 object-contain"
          />
          <h1 className="font-display text-3xl font-bold text-foreground leading-tight">Build the foundation of understanding.</h1>
          <p className="mt-2 text-3xl font-bold text-muted-foreground leading-tight">Join Athena Metrics.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl pr-11" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="university">University</Label>
            <Input id="university" placeholder="e.g. Università di Padova" value={university} onChange={(e) => setUniversity(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="matricola">Numero di Matricola <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="matricola" placeholder="e.g. 123456" value={matricola} onChange={(e) => setMatricola(e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select your year" /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6].map(y => (
                  <SelectItem key={y} value={String(y)}>{y === 1 ? "1st" : y === 2 ? "2nd" : y === 3 ? "3rd" : `${y}th`} Year</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GDPR Consent */}
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsentGiven(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="consent" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              I agree to the{" "}
              <Link to="/privacy" className="text-primary hover:underline" target="_blank">Privacy Policy</Link>{" "}
              and{" "}
              <Link to="/terms" className="text-primary hover:underline" target="_blank">Terms of Service</Link>.
              I understand how my data will be processed.
            </label>
          </div>

          <Button type="submit" disabled={isLoading || !consentGiven} className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground">
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Are you a university administrator?{" "}
          <Link to="/university-signup" className="font-medium text-primary hover:underline">
            Register your institution here
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;

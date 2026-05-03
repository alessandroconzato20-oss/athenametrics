import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const UniversitySignup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [university, setUniversity] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleCopy = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      toast.success("Key copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!university || !accessCode) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsLoading(true);
    try {
      await signUp(email, password, name, 0, "", university);
      toast.info("Verifying access code...");

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast.success("Account created! Please verify your email, then sign in. Your university key will be generated on first login.");
        navigate("/login");
        return;
      }

      if (signInData.user) {
        const { data: valid, error: verifyError } = await supabase.rpc("verify_university_code", {
          _user_id: signInData.user.id,
          _university_name: university,
          _access_code: accessCode,
        });

        if (verifyError || !valid) {
          toast.error("Invalid access code for this university.");
          await supabase.auth.signOut();
          navigate("/login");
          return;
        }

        await supabase.from("profiles").update({ university } as any).eq("id", signInData.user.id);

        // Fetch the auto-generated login key
        const { data: keyData } = await supabase
          .from("university_login_keys")
          .select("login_key")
          .eq("user_id", signInData.user.id)
          .single();

        if (keyData?.login_key) {
          setGeneratedKey(keyData.login_key);
          toast.success("Account created! Save your university key below.");
        } else {
          toast.success("University admin account created!");
          navigate("/admin");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  if (generatedKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30"
          >
            <Check className="h-10 w-10 text-green-600" />
          </motion.div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Account Created!</h1>
          <p className="text-muted-foreground mb-8">Save your university key — you'll need it to sign in. It rotates every week.</p>

          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 mb-6">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Your University Key</p>
            <p className="font-mono text-4xl font-bold tracking-[0.3em] text-primary">{generatedKey}</p>
            <p className="text-xs text-muted-foreground mt-3">Valid for 7 days from now</p>
          </div>

          <Button onClick={handleCopy} variant="outline" className="w-full h-11 rounded-xl mb-4">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied!" : "Copy Key"}
          </Button>

          <Button onClick={() => navigate("/university-setup")} className="w-full h-12 rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground">
            Start onboarding →
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-foreground">University Admin</h1>
          <p className="mt-2 text-muted-foreground">Register as a university administrator. You'll receive a unique login key after registration.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
            <p className="text-xs text-muted-foreground">Used only for account recovery. You'll sign in with your university key.</p>
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
            <Label htmlFor="university">University / Institution Name</Label>
            <Input id="university" placeholder="e.g. Università di Padova" value={university} onChange={(e) => setUniversity(e.target.value)} required className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessCode">Access Code</Label>
            <Input id="accessCode" placeholder="Enter your institution's access code" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required className="h-12 rounded-xl" />
            <p className="text-xs text-muted-foreground">Contact your Athena Metrics representative to obtain your institution's access code.</p>
          </div>
          <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground">
            {isLoading ? "Creating account..." : "Register as University Admin"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/university-login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Are you a student?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">Student sign up</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default UniversitySignup;

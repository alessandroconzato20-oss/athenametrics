import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, KeyRound, Mail, Copy, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const UniversityLogin = () => {
  const [loginKey, setLoginKey] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopyKey = async () => {
    if (revealedKey) {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      toast.success("Key copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFirstTimeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        toast.error("Invalid email or password");
        return;
      }

      // Fetch their login key
      const { data: keyData } = await supabase
        .from("university_login_keys")
        .select("login_key")
        .eq("user_id", signInData.user.id)
        .single();

      if (keyData?.login_key) {
        setRevealedKey(keyData.login_key);
        toast.success("Here's your university key! Save it for future logins.");
      } else {
        toast.error("No university key found for this account. Contact your administrator.");
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      const { data: email, error: lookupError } = await supabase.rpc(
        "lookup_email_by_login_key",
        { _login_key: loginKey.trim().toUpperCase() }
      );

      if (lookupError || !email) {
        toast.error("Invalid or expired university key. Keys rotate weekly — contact your administrator.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast.error("Invalid password");
        return;
      }

      toast.success("Signed in successfully!");
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };


  // Key revealed screen after first-time login
  // Key revealed screen after first-time login
  if (revealedKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30"
          >
            <KeyRound className="h-10 w-10 text-green-600" />
          </motion.div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Your University Key</h1>
          <p className="text-muted-foreground mb-8">Save this key — you'll use it instead of your email for future logins. It rotates every week.</p>

          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 mb-6">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">University Key</p>
            <p className="font-mono text-4xl font-bold tracking-[0.3em] text-primary">{revealedKey}</p>
            <p className="text-xs text-muted-foreground mt-3">Valid for 7 days</p>
          </div>

          <Button onClick={handleCopyKey} variant="outline" className="w-full h-11 rounded-xl mb-4">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied!" : "Copy Key"}
          </Button>

          <Button onClick={() => navigate("/admin")} className="w-full h-12 rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground">
            Go to Admin Panel →
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary"
          >
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-foreground">University Staff</h1>
          <p className="mt-2 text-muted-foreground">
            {isFirstTime
              ? "First time? Sign in with your email to retrieve your university key."
              : "Sign in with your university key and personal password."}
          </p>
        </div>

        {isFirstTime ? (
          <form onSubmit={handleFirstTimeLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">The email you used during registration.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstTimePassword">Password</Label>
              <div className="relative">
                <Input
                  id="firstTimePassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground"
            >
              {isLoading ? "Retrieving key..." : "Get My University Key"}
            </Button>
            <button
              type="button"
              onClick={() => { setIsFirstTime(false); setEmail(""); setPassword(""); }}
              className="flex items-center justify-center gap-1 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to key login
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginKey">University Key</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="loginKey"
                    placeholder="e.g. A3F9B21C"
                    value={loginKey}
                    onChange={(e) => setLoginKey(e.target.value.toUpperCase())}
                    required
                    className="h-12 rounded-xl pl-10 font-mono tracking-widest uppercase"
                    maxLength={8}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Your key rotates weekly. Check with your institution if expired.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground"
              >
                {isLoading ? "Signing in..." : "Sign In to Admin Panel"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => { setIsFirstTime(true); setLoginKey(""); setPassword(""); }}
              className="mt-4 flex items-center justify-center gap-1.5 w-full text-sm font-medium text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5" /> First time? Retrieve your key via email
            </button>
          </>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center"
        >
          <p className="mb-2 text-sm font-medium text-foreground">New university staff member?</p>
          <p className="mb-4 text-xs text-muted-foreground">Register your institution to manage syllabi and monitor student progress 🎓</p>
          <Link to="/university-signup">
            <Button variant="outline" className="w-full h-11 rounded-xl border-primary text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">
              Register as University Admin →
            </Button>
          </Link>
        </motion.div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Are you a student?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Student sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default UniversityLogin;

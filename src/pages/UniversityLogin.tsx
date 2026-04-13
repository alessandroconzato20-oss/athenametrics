import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

const UniversityLogin = () => {
  const [loginKey, setLoginKey] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      // Look up email by login key
      const { data: email, error: lookupError } = await supabase.rpc(
        "lookup_email_by_login_key",
        { _login_key: loginKey.trim().toUpperCase() }
      );

      if (lookupError || !email) {
        toast.error("Invalid or expired university key. Keys rotate weekly — contact your administrator.");
        return;
      }

      // Sign in with the resolved email + password
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
          <p className="mt-2 text-muted-foreground">Sign in with your university key and personal password.</p>
        </div>

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

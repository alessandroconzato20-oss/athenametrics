import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import athenaLogo from "@/assets/athena-logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in");
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <motion.img
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.15 }}
            src={athenaLogo}
            alt="Athena Metrics"
            className="mb-6 h-20 w-20 object-contain"
          />
          <h1 className="font-display text-3xl font-bold text-foreground leading-tight">Good to see you again.</h1>
          <p className="mt-2 text-3xl font-bold text-muted-foreground leading-tight">Learning never pauses.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground">
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center"
        >
          <p className="mb-2 text-sm font-medium text-foreground">New to Athena Metrics?</p>
          <p className="mb-4 text-xs text-muted-foreground">Join Humanitas students already optimising their study performance 🚀</p>
          <Link to="/signup">
            <Button variant="outline" className="w-full h-11 rounded-xl border-primary text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">
              Create your free account →
            </Button>
          </Link>
        </motion.div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          University staff?{" "}
          <Link to="/university-login" className="font-medium text-primary hover:underline">Access the admin panel →</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;

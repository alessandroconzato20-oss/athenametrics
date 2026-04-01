import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const UniversitySignup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [university, setUniversity] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!university || !accessCode) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsLoading(true);
    try {
      // First sign up the user
      await signUp(email, password, name, 0, "", university);

      toast.info("Verifying access code...");

      // Sign in to get the user ID, then verify the code
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If email confirmation is required, we can't sign in yet
        toast.success("Account created! Please verify your email, then sign in. Your access code will be verified on first login.");
        navigate("/login");
        return;
      }

      if (signInData.user) {
        // Verify access code and assign role
        const { data: valid, error: verifyError } = await supabase.rpc("verify_university_code", {
          _user_id: signInData.user.id,
          _university_name: university,
          _access_code: accessCode,
        });

        if (verifyError || !valid) {
          toast.error("Invalid access code for this university. Your account was created but you won't have admin access.");
          await supabase.auth.signOut();
          navigate("/login");
          return;
        }

        // Also update profile with university
        await supabase.from("profiles").update({ university } as any).eq("id", signInData.user.id);

        toast.success("University admin account created successfully!");
        navigate("/admin");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-foreground">University Admin</h1>
          <p className="mt-2 text-muted-foreground">Register as a university administrator to manage your institution's syllabi and monitor student progress.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">University Email</Label>
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
            <Label htmlFor="university">University / Institution Name</Label>
            <Input id="university" placeholder="e.g. Università di Padova" value={university} onChange={(e) => setUniversity(e.target.value)} required className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessCode">Access Code</Label>
            <Input id="accessCode" placeholder="Enter your institution's access code" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required className="h-12 rounded-xl" />
            <p className="text-xs text-muted-foreground">
              Contact your CoFactor representative to obtain your institution's access code.
            </p>
          </div>
          <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground">
            {isLoading ? "Creating account..." : "Register as University Admin"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
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

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  universityId: string | null;
  universityName: string | null;
  role: string | null;
  signUp: (email: string, password: string, name: string, year: number, matricola: string, cohortCode: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  displayName: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const loadProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("university_id, university")
      .eq("id", userId)
      .single();
    if (profile) {
      setUniversityId((profile as any).university_id ?? null);
      setUniversityName(profile.university ?? null);
    }
    // Load role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roles && roles.length > 0) {
      // Prefer admin > university_admin > user
      const roleNames = roles.map((r: any) => r.role);
      if (roleNames.includes("admin")) setRole("admin");
      else if (roleNames.includes("university_admin")) setRole("university_admin");
      else setRole("user");
    } else {
      setRole("user");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer profile load to avoid Supabase deadlock
        setTimeout(() => loadProfile(session.user.id), 0);
      } else {
        setUniversityId(null);
        setUniversityName(null);
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, year: number, matricola: string, university: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, year, matricola, university },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const displayName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Student";

  return (
    <AuthContext.Provider value={{ user, session, loading, universityId, universityName, role, signUp, signIn, signOut, displayName }}>
      {children}
    </AuthContext.Provider>
  );
};

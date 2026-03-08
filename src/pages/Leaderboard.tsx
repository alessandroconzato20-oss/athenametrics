import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Clock, BookOpen, Medal, Crown, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_minutes: number;
  total_sessions: number;
  subjects_studied: number;
}

const rankIcon = (index: number) => {
  if (index === 0) return <Crown className="h-5 w-5 text-accent" />;
  if (index === 1) return <Medal className="h-5 w-5 text-muted-foreground" />;
  if (index === 2) return <Award className="h-5 w-5 text-accent-foreground" />;
  return <span className="flex h-5 w-5 items-center justify-center text-xs font-bold text-muted-foreground">{index + 1}</span>;
};

const formatTime = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const Leaderboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Check if user has a profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      setHasProfile(!!profile);
      if (profile) setUsername(profile.username);

      // Fetch leaderboard
      const { data } = await supabase
        .from("leaderboard" as any)
        .select("*")
        .order("total_minutes", { ascending: false })
        .limit(50);

      setEntries((data as unknown as LeaderboardEntry[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleJoin = async () => {
    if (!user || !username.trim()) return;
    setSubmitting(true);
    const trimmed = username.trim();

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username: trimmed }, { onConflict: "id" });

    if (error) {
      toast({
        title: "Error",
        description: error.message.includes("unique") ? "Username already taken. Try another!" : error.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    setHasProfile(true);
    toast({ title: "Welcome to the leaderboard! 🏆" });

    // Refresh
    const { data } = await supabase
      .from("leaderboard" as any)
      .select("*")
      .order("total_minutes", { ascending: false })
      .limit(50);
    setEntries((data as unknown as LeaderboardEntry[]) || []);
    setSubmitting(false);
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="rounded-xl p-2 text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Leaderboard</h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Humanitas University — see who's putting in the work 💪
        </p>

        {/* Join / Username */}
        {hasProfile === false && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-border bg-card p-5"
          >
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Join the Leaderboard</h2>
            <p className="mb-4 text-sm text-muted-foreground">Pick a username to appear on the board.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                className="rounded-xl"
              />
              <Button onClick={handleJoin} disabled={!username.trim() || submitting} className="rounded-xl px-5">
                {submitting ? "..." : "Join"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Leaderboard */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No one on the board yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isMe = entry.user_id === user?.id;
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                    isMe
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
                  } ${i < 3 ? "shadow-sm" : ""}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                    {rankIcon(i)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-foreground">
                      {entry.username} {isMe && <span className="text-xs text-primary">(you)</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatTime(entry.total_minutes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {entry.total_sessions} sessions
                      </span>
                      <span>{entry.subjects_studied} subjects</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-foreground">{formatTime(entry.total_minutes)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;

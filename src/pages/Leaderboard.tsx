import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Clock, BookOpen, Medal, Crown, Award, Plus, LogIn, Copy, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_minutes: number;
  total_sessions: number;
  subjects_studied: number;
}

interface Library {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
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

  // Library state
  const [activeLibrary, setActiveLibrary] = useState<Library | null>(null);
  const [showLibraryDialog, setShowLibraryDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"menu" | "create" | "join">("menu");
  const [libName, setLibName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [libSubmitting, setLibSubmitting] = useState(false);

  const fetchLeaderboard = useCallback(async (libraryId?: string) => {
    if (!user) return;
    setLoading(true);

    if (libraryId) {
      // Get member user_ids
      const { data: members } = await supabase
        .from("library_members" as any)
        .select("user_id")
        .eq("library_id", libraryId);

      const memberIds = (members as any[] || []).map((m: any) => m.user_id);
      // Also include the library creator
      if (activeLibrary && !memberIds.includes(activeLibrary.created_by)) {
        memberIds.push(activeLibrary.created_by);
      }

      if (memberIds.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("leaderboard" as any)
        .select("*")
        .in("user_id", memberIds)
        .order("total_minutes", { ascending: false })
        .limit(50);

      setEntries((data as unknown as LeaderboardEntry[]) || []);
    } else {
      const { data } = await supabase
        .from("leaderboard" as any)
        .select("*")
        .order("total_minutes", { ascending: false })
        .limit(50);

      setEntries((data as unknown as LeaderboardEntry[]) || []);
    }
    setLoading(false);
  }, [user, activeLibrary]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      setHasProfile(!!profile);
      if (profile) setUsername(profile.username);

      // Check if user is in a library
      const { data: membership } = await supabase
        .from("library_members" as any)
        .select("library_id")
        .eq("user_id", user.id)
        .limit(1);

      const mem = membership as any[] | null;
      if (mem && mem.length > 0) {
        const { data: lib } = await supabase
          .from("study_libraries" as any)
          .select("*")
          .eq("id", mem[0].library_id)
          .maybeSingle();

        if (lib) {
          setActiveLibrary(lib as unknown as Library);
          await fetchLeaderboardDirect((lib as any).id);
          return;
        }
      }

      // Also check if user created a library (creator auto-member)
      const { data: ownedLib } = await supabase
        .from("study_libraries" as any)
        .select("*")
        .eq("created_by", user.id)
        .limit(1);

      const owned = ownedLib as any[] | null;
      if (owned && owned.length > 0) {
        setActiveLibrary(owned[0] as unknown as Library);
        await fetchLeaderboardDirect(owned[0].id);
        return;
      }

      // No library — show global
      await fetchLeaderboardDirect();
    };
    load();
  }, [user]);

  const fetchLeaderboardDirect = async (libraryId?: string) => {
    if (!user) return;
    setLoading(true);

    if (libraryId) {
      const { data: members } = await supabase
        .from("library_members" as any)
        .select("user_id")
        .eq("library_id", libraryId);

      const memberIds = (members as any[] || []).map((m: any) => m.user_id);

      // Include creator
      const { data: libData } = await supabase
        .from("study_libraries" as any)
        .select("created_by")
        .eq("id", libraryId)
        .maybeSingle();

      if (libData && !(memberIds.includes((libData as any).created_by))) {
        memberIds.push((libData as any).created_by);
      }

      if (memberIds.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("leaderboard" as any)
        .select("*")
        .in("user_id", memberIds)
        .order("total_minutes", { ascending: false })
        .limit(50);

      setEntries((data as unknown as LeaderboardEntry[]) || []);
    } else {
      const { data } = await supabase
        .from("leaderboard" as any)
        .select("*")
        .order("total_minutes", { ascending: false })
        .limit(50);

      setEntries((data as unknown as LeaderboardEntry[]) || []);
    }
    setLoading(false);
  };

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
    await fetchLeaderboardDirect(activeLibrary?.id);
    setSubmitting(false);
  };

  const handleCreateLibrary = async () => {
    if (!user || !libName.trim()) return;
    setLibSubmitting(true);

    const { data, error } = await supabase
      .from("study_libraries" as any)
      .insert({ name: libName.trim(), created_by: user.id } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLibSubmitting(false);
      return;
    }

    const lib = data as unknown as Library;

    // Auto-join as member
    await supabase.from("library_members" as any).insert({ library_id: lib.id, user_id: user.id } as any);

    setActiveLibrary(lib);
    setShowLibraryDialog(false);
    setLibName("");
    toast({ title: `"${lib.name}" created! Share code: ${lib.invite_code}` });
    await fetchLeaderboardDirect(lib.id);
    setLibSubmitting(false);
  };

  const handleJoinLibrary = async () => {
    if (!user || !joinCode.trim()) return;
    setLibSubmitting(true);

    const { data, error } = await supabase.rpc("join_library_by_code", {
      _user_id: user.id,
      _invite_code: joinCode.trim().toLowerCase(),
    });

    if (error || !data) {
      toast({ title: "Invalid code", description: "No library found with that code.", variant: "destructive" });
      setLibSubmitting(false);
      return;
    }

    // Fetch the library details
    const { data: lib } = await supabase
      .from("study_libraries" as any)
      .select("*")
      .eq("id", data)
      .maybeSingle();

    if (lib) {
      setActiveLibrary(lib as unknown as Library);
      toast({ title: `Joined "${(lib as any).name}"! 🎉` });
      await fetchLeaderboardDirect((lib as any).id);
    }

    setShowLibraryDialog(false);
    setJoinCode("");
    setLibSubmitting(false);
  };

  const handleLeaveLibrary = async () => {
    if (!user || !activeLibrary) return;

    await supabase
      .from("library_members" as any)
      .delete()
      .eq("user_id", user.id)
      .eq("library_id", activeLibrary.id);

    // If creator, also delete the library
    if (activeLibrary.created_by === user.id) {
      await supabase.from("study_libraries" as any).delete().eq("id", activeLibrary.id);
      toast({ title: "Library deleted" });
    } else {
      toast({ title: `Left "${activeLibrary.name}"` });
    }

    setActiveLibrary(null);
    await fetchLeaderboardDirect();
  };

  const copyCode = () => {
    if (activeLibrary) {
      navigator.clipboard.writeText(activeLibrary.invite_code);
      toast({ title: "Code copied! 📋" });
    }
  };

  const openDialog = (mode: "menu" | "create" | "join") => {
    setDialogMode(mode);
    setShowLibraryDialog(true);
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 pb-10 pt-8">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="rounded-xl p-2 text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              {activeLibrary ? activeLibrary.name : "Leaderboard"}
            </h1>
          </div>
        </div>

        {/* Library bar */}
        {activeLibrary ? (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{activeLibrary.name}</span>
            <button onClick={copyCode} className="ml-auto flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              <Copy className="h-3 w-3" /> {activeLibrary.invite_code}
            </button>
            <button
              onClick={handleLeaveLibrary}
              className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20"
            >
              <LogOut className="h-3 w-3" /> {activeLibrary.created_by === user?.id ? "Delete" : "Leave"}
            </button>
          </div>
        ) : (
          <div className="mb-5 flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openDialog("create")}>
              <Plus className="mr-1 h-4 w-4" /> Create Library
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openDialog("join")}>
              <LogIn className="mr-1 h-4 w-4" /> Join Library
            </Button>
          </div>
        )}

        <p className="mb-5 text-sm text-muted-foreground">
          {activeLibrary
            ? "Private leaderboard — only members can see this."
            : "Create your own study crew or join a friend's — compete, stay accountable, and crush your goals together 🔥"}
        </p>

        {/* Join profile */}
        {hasProfile === false && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Join the Leaderboard</h2>
            <p className="mb-4 text-sm text-muted-foreground">Pick a username to appear on the board.</p>
            <div className="flex gap-2">
              <Input placeholder="Your username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} className="rounded-xl" />
              <Button onClick={handleJoin} disabled={!username.trim() || submitting} className="rounded-xl px-5">
                {submitting ? "..." : "Join"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Leaderboard list */}
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
                <motion.div key={entry.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                    isMe ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  } ${i < 3 ? "shadow-sm" : ""}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">{rankIcon(i)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-foreground">
                      {entry.username} {isMe && <span className="text-xs text-primary">(you)</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(entry.total_minutes)}</span>
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {entry.total_sessions} sessions</span>
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

      {/* Library dialog */}
      <Dialog open={showLibraryDialog} onOpenChange={setShowLibraryDialog}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <AnimatePresence mode="wait">
            {dialogMode === "menu" && (
              <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle>Private Library</DialogTitle>
                  <DialogDescription>Create your own leaderboard or join an existing one.</DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex flex-col gap-3">
                  <Button onClick={() => setDialogMode("create")} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Create a Library</Button>
                  <Button variant="outline" onClick={() => setDialogMode("join")} className="rounded-xl"><LogIn className="mr-2 h-4 w-4" /> Join with Code</Button>
                </div>
              </motion.div>
            )}

            {dialogMode === "create" && (
              <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle>Create a Library</DialogTitle>
                  <DialogDescription>Give your private leaderboard a name. You'll get a code to share.</DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-3">
                  <Input placeholder="Library name" value={libName} onChange={(e) => setLibName(e.target.value)} maxLength={30} className="rounded-xl" />
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="ghost" onClick={() => setDialogMode("menu")} className="rounded-xl">Back</Button>
                  <Button onClick={handleCreateLibrary} disabled={!libName.trim() || libSubmitting} className="rounded-xl">
                    {libSubmitting ? "..." : "Create"}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}

            {dialogMode === "join" && (
              <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle>Join a Library</DialogTitle>
                  <DialogDescription>Enter the invite code shared by a friend.</DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-3">
                  <Input placeholder="Invite code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} maxLength={20} className="rounded-xl" />
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="ghost" onClick={() => setDialogMode("menu")} className="rounded-xl">Back</Button>
                  <Button onClick={handleJoinLibrary} disabled={!joinCode.trim() || libSubmitting} className="rounded-xl">
                    {libSubmitting ? "..." : "Join"}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leaderboard;

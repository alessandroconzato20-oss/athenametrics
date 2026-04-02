import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Download, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleExportData = async () => {
    setExporting(true);
    try {
      const tables = ["study_logs", "daily_scores", "student_personas", "topic_mastery", "weekly_goals", "study_schedule", "user_feedback", "consent_logs"] as const;
      const exportData: Record<string, any> = { account: { email: user.email, created_at: user.created_at, metadata: user.user_metadata } };

      for (const table of tables) {
        const { data } = await supabase.from(table).select("*");
        exportData[table] = data || [];
      }

      // Profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      exportData.profile = profile;

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cofactor-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Log the export for GDPR audit
      await supabase.from("consent_logs").insert({ user_id: user.id, consent_type: "data_export" });
      toast.success("Your data has been exported successfully.");
    } catch (err: any) {
      toast.error("Failed to export data: " + (err.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Log deletion consent
      await supabase.from("consent_logs").insert({ user_id: user.id, consent_type: "account_deletion_requested" });

      // Call the security-definer function to delete all user data
      const { error } = await supabase.rpc("delete_user_data", { _user_id: user.id });
      if (error) throw error;

      await signOut();
      toast.success("Your account and all data have been permanently deleted.");
      navigate("/login");
    } catch (err: any) {
      toast.error("Failed to delete account: " + (err.message || "Unknown error"));
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Account & Privacy</h1>
        <p className="text-muted-foreground text-sm mb-8">Manage your data and privacy settings under GDPR.</p>

        <div className="space-y-4">
          {/* Data Export */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">Export My Data</h2>
                <p className="text-sm text-muted-foreground mt-1">Download all your personal data in JSON format (GDPR Art. 20 — Right to Data Portability).</p>
                <Button onClick={handleExportData} disabled={exporting} variant="outline" size="sm" className="mt-3 rounded-xl">
                  {exporting ? "Exporting..." : "Download My Data"}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Privacy Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">Your Privacy Rights</h2>
                <p className="text-sm text-muted-foreground mt-1">Under GDPR, you have the right to access, rectify, restrict, and erase your personal data at any time.</p>
                <div className="flex gap-2 mt-3">
                  <Link to="/privacy">
                    <Button variant="outline" size="sm" className="rounded-xl">Privacy Policy</Button>
                  </Link>
                  <Link to="/terms">
                    <Button variant="outline" size="sm" className="rounded-xl">Terms of Service</Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Account Deletion */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-destructive/30 bg-card p-5">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 mt-0.5 text-destructive" />
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">Delete Account</h2>
                <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all associated data. This action cannot be undone (GDPR Art. 17 — Right to Erasure).</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="mt-3 rounded-xl" disabled={deleting}>
                      {deleting ? "Deleting..." : "Delete My Account"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account, all study logs, scores, personas, goals, and any other data associated with your account. This action is irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, Delete Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;

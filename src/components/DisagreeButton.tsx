import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsDown, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface DisagreeButtonProps {
  feedbackType: string;
  context: Record<string, any>;
  size?: "sm" | "md";
}

const quickReasons = [
  "I feel different than what's shown",
  "The recommendation doesn't fit my schedule",
  "My energy/focus is actually higher",
  "My energy/focus is actually lower",
];

const DisagreeButton = ({ feedbackType, context, size = "sm" }: DisagreeButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [customReason, setCustomReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submitFeedback = async (reason: string) => {
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("user_feedback").insert({
      user_id: user.id,
      feedback_type: feedbackType,
      context,
      reason,
    } as any);

    setSending(false);
    if (error) {
      console.error("Feedback error:", error);
      toast.error("Failed to save feedback");
      return;
    }
    setSent(true);
    toast.success("Thanks! We'll recalibrate for you.");
    setTimeout(() => { setOpen(false); setSent(false); }, 1500);
  };

  if (sent) {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="text-xs font-medium text-primary"
      >
        ✓ Noted
      </motion.div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className={`flex items-center justify-center rounded-full transition-colors hover:scale-110 active:scale-90 ${
          size === "sm"
            ? "h-6 w-6 bg-muted/60 hover:bg-destructive/10"
            : "h-7 w-7 bg-muted hover:bg-destructive/10"
        }`}
        title="This doesn't feel right"
      >
        <ThumbsDown className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} text-muted-foreground hover:text-destructive transition-colors`} />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-64 rounded-2xl p-4 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-foreground mb-3">What feels off?</p>

        <div className="space-y-1.5 mb-3">
          {quickReasons.map((reason) => (
            <button
              key={reason}
              disabled={sending}
              onClick={() => submitFeedback(reason)}
              className="w-full rounded-xl bg-muted/50 px-3 py-2 text-left text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {reason}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Other reason..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="flex-1 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
            onKeyDown={(e) => { if (e.key === "Enter" && customReason.trim()) submitFeedback(customReason.trim()); }}
          />
          <button
            disabled={!customReason.trim() || sending}
            onClick={() => submitFeedback(customReason.trim())}
            className="rounded-lg bg-primary/10 px-2 py-1.5 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>

        <p className="mt-2.5 text-[10px] text-muted-foreground leading-tight">
          Your feedback helps recalibrate recommendations to match how you actually feel.
        </p>
      </PopoverContent>
    </Popover>
  );
};

export default DisagreeButton;

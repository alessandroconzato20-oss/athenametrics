import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, Trash2, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ScheduleEntry {
  id: string;
  schedule_date: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
}

const StudyCalendar = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchEntries = async () => {
    if (!user) return;
    const { data } = await (supabase.from("study_schedule" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("schedule_date", { ascending: true }) as any);
    if (data) setEntries(data as ScheduleEntry[]);
  };

  useEffect(() => {
    if (open && user) fetchEntries();
  }, [open, user]);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const dayEntries = entries.filter(e => e.schedule_date === selectedDateStr);
  const datesWithEntries = entries.map(e => parseISO(e.schedule_date));

  const addEntry = async () => {
    if (!user || !newTitle.trim() || !selectedDate) return;
    setLoading(true);
    const { error } = await (supabase.from("study_schedule" as any).insert({
      user_id: user.id,
      schedule_date: selectedDateStr,
      title: newTitle.trim(),
      start_time: newStart || null,
      end_time: newEnd || null,
    } as any) as any);
    if (error) {
      toast.error("Failed to add entry");
    } else {
      toast.success("Study session added!");
      setNewTitle("");
      setNewStart("");
      setNewEnd("");
      setShowAdd(false);
      await fetchEntries();
    }
    setLoading(false);
  };

  const deleteEntry = async (id: string) => {
    await (supabase.from("study_schedule" as any).delete().eq("id", id) as any);
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success("Entry removed");
  };

  return (
    <>
      {/* Red bubbly calendar button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-destructive-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
      >
        <CalendarIcon className="h-4 w-4" />
        <span className="text-xs font-bold">Calendar</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-4 pb-6 pt-4">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-center font-display text-lg">Study Schedule</SheetTitle>
          </SheetHeader>

          {/* Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="pointer-events-auto rounded-2xl border bg-card p-3"
              modifiers={{ hasEntry: datesWithEntries }}
              modifiersStyles={{
                hasEntry: {
                  backgroundColor: "hsl(var(--destructive))",
                  color: "hsl(var(--destructive-foreground))",
                  borderRadius: "9999px",
                },
              }}
            />
          </div>

          {/* Day entries */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">
                {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a date"}
              </h3>
              {selectedDate && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground transition-transform hover:scale-105"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              )}
            </div>

            {/* Add form */}
            <AnimatePresence>
              {showAdd && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 overflow-hidden"
                >
                  <div className="rounded-2xl bg-muted p-3 space-y-2">
                    <Input
                      placeholder="What are you studying?"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="bg-background text-sm"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">Start</label>
                        <Input
                          type="time"
                          value={newStart}
                          onChange={e => setNewStart(e.target.value)}
                          className="bg-background text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">End</label>
                        <Input
                          type="time"
                          value={newEnd}
                          onChange={e => setNewEnd(e.target.value)}
                          className="bg-background text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addEntry} disabled={loading || !newTitle.trim()} className="flex-1">
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Entries list */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {dayEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No study sessions planned</p>
              ) : (
                dayEntries.map(entry => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between rounded-xl bg-card p-3 shadow-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{entry.title}</p>
                      {(entry.start_time || entry.end_time) && (
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {entry.start_time || "?"} – {entry.end_time || "?"}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="ml-2 rounded-lg p-1.5 text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default StudyCalendar;

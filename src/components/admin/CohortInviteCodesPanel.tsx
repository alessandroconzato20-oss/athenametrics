import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Plus, KeyRound } from "lucide-react";

interface Props {
  universityId: string | null;
  universityName: string | null;
}

interface CodeRow {
  id: string;
  code: string;
  label: string | null;
  year: number | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const generateCode = (uniName: string, year: string) => {
  const slug = (uniName || "UNI")
    .toUpperCase()
    .replace(/[^A-Z]+/g, "")
    .slice(0, 5) || "UNI";
  const yr = year ? `Y${year}` : "GEN";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${slug}-${yr}-${rand}`;
};

const CohortInviteCodesPanel = ({ universityId, universityName }: Props) => {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [year, setYear] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!universityId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cohort_invite_codes" as any)
      .select("*")
      .eq("university_id", universityId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCodes(((data as any[]) || []) as CodeRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [universityId]);

  const create = async () => {
    if (!universityId || !universityName) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }
    const code = generateCode(universityName, year);
    const { error } = await supabase.from("cohort_invite_codes" as any).insert({
      university_id: universityId,
      university_name: universityName,
      code,
      label: label || null,
      year: year ? parseInt(year) : null,
      max_uses: maxUses ? parseInt(maxUses) : null,
      created_by: user.id,
    } as any);
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Code created: ${code}`);
    setLabel(""); setYear(""); setMaxUses("");
    load();
  };

  const toggleActive = async (row: CodeRow) => {
    const { error } = await supabase
      .from("cohort_invite_codes" as any)
      .update({ is_active: !row.is_active } as any)
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Student Invite Codes</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Share these codes with students. They enter the code at signup to be linked automatically to {universityName || "your institution"}.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="space-y-1">
          <Label className="text-xs">Label (optional)</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Medicine, Year 2" maxLength={60} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Year (optional)</Label>
          <Input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 1))} placeholder="2" inputMode="numeric" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max uses (optional)</Label>
          <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="∞" inputMode="numeric" />
        </div>
        <div className="flex items-end">
          <Button onClick={create} disabled={creating || !universityId} className="w-full gap-1">
            <Plus className="h-4 w-4" /> Generate
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No codes yet.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div key={c.id} className={`flex items-center gap-3 rounded-lg border p-3 ${c.is_active ? "" : "opacity-60"}`}>
              <button onClick={() => copy(c.code)} className="font-mono text-sm font-semibold tracking-wider hover:text-primary inline-flex items-center gap-1.5">
                {c.code}
                <Copy className="h-3 w-3" />
              </button>
              <div className="text-xs text-muted-foreground flex-1 truncate">
                {c.label && <span className="mr-2">{c.label}</span>}
                {c.year && <span className="mr-2">Year {c.year}</span>}
                <span>{c.uses_count}{c.max_uses ? `/${c.max_uses}` : ""} uses</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{c.is_active ? "Active" : "Off"}</span>
                <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default CohortInviteCodesPanel;

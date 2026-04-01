import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload, FileText, Trash2, CheckCircle, Clock, XCircle,
  ChevronDown, ChevronUp, Sparkles, GraduationCap, Loader2
} from "lucide-react";
import { toast } from "sonner";

interface SyllabusEntry {
  id: string;
  university_name: string;
  course_name: string;
  credits: number | null;
  year: number;
  semester: number;
  topics: any[];
  pdf_path: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const SyllabusManager = () => {
  const { user } = useAuth();
  const [syllabi, setSyllabi] = useState<SyllabusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [universityName, setUniversityName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [credits, setCredits] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("0");
  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const fetchSyllabi = async () => {
    const { data, error } = await supabase
      .from("university_syllabi")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load syllabi");
    } else {
      setSyllabi((data as any[]) || []);
    }
    setLoading(false);
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    // Read PDF as text - we'll send the raw content to AI for parsing
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    // Simple text extraction from PDF bytes
    let text = "";
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(bytes);

    // Extract text between stream/endstream and BT/ET markers
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    while ((match = streamRegex.exec(raw)) !== null) {
      const content = match[1];
      // Extract readable text
      const textParts = content.match(/\(([^)]*)\)/g);
      if (textParts) {
        text += textParts.map(p => p.slice(1, -1)).join(" ") + "\n";
      }
    }

    // Also try plain text extraction
    const plainText = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ");
    if (text.trim().length < 100) {
      text = plainText;
    }

    return text.slice(0, 20000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !universityName || !courseName || !year) {
      toast.error("Please fill in required fields");
      return;
    }

    setUploading(true);
    try {
      let pdfPath: string | null = null;
      let topics: any[] = [];

      // Upload PDF if provided
      if (pdfFile) {
        const filePath = `${user.id}/${Date.now()}_${pdfFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("syllabi")
          .upload(filePath, pdfFile);
        if (uploadError) throw uploadError;
        pdfPath = filePath;

        // Parse PDF with AI
        setParsing(true);
        toast.info("AI is parsing the syllabus...");
        const pdfText = await extractTextFromPdf(pdfFile);

        const { data: parseData, error: parseError } = await supabase.functions.invoke("parse-syllabus", {
          body: { pdfText, courseName, universityName },
        });

        if (parseError) {
          console.error("Parse error:", parseError);
          toast.warning("AI parsing failed, you can add topics manually later");
        } else if (parseData?.topics) {
          topics = parseData.topics;
          toast.success(`AI extracted ${topics.length} topics!`);
        }
        setParsing(false);
      }

      // Insert syllabus entry
      const { error: insertError } = await supabase
        .from("university_syllabi")
        .insert({
          university_name: universityName,
          course_name: courseName,
          credits: credits ? parseInt(credits) : null,
          year: parseInt(year),
          semester: parseInt(semester),
          topics,
          pdf_path: pdfPath,
          uploaded_by: user.id,
          notes: notes || null,
        } as any);

      if (insertError) throw insertError;

      toast.success("Syllabus uploaded successfully!");
      resetForm();
      fetchSyllabi();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload syllabus");
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  const resetForm = () => {
    setUniversityName("");
    setCourseName("");
    setCredits("");
    setYear("");
    setSemester("0");
    setNotes("");
    setPdfFile(null);
    setShowForm(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "approved" ? "pending" : "approved";
    const { error } = await supabase
      .from("university_syllabi")
      .update({ status: newStatus } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Syllabus ${newStatus}`);
      fetchSyllabi();
    }
  };

  const deleteSyllabus = async (id: string, pdfPath: string | null) => {
    if (pdfPath) {
      await supabase.storage.from("syllabi").remove([pdfPath]);
    }
    const { error } = await supabase.from("university_syllabi").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Syllabus deleted");
      fetchSyllabi();
    }
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">University Syllabi</h2>
          <Badge variant="secondary" className="text-xs">{syllabi.length}</Badge>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className="gap-1"
        >
          <Upload className="h-4 w-4" />
          Upload Syllabus
        </Button>
      </div>

      {/* Upload Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Card>
              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="uni">University Name *</Label>
                      <Input
                        id="uni"
                        placeholder="e.g. Università di Padova"
                        value={universityName}
                        onChange={(e) => setUniversityName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="course">Course / Subject Name *</Label>
                      <Input
                        id="course"
                        placeholder="e.g. Human Anatomy"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="credits">Credits</Label>
                      <Input
                        id="credits"
                        type="number"
                        placeholder="e.g. 6"
                        value={credits}
                        onChange={(e) => setCredits(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Year *</Label>
                      <Select value={year} onValueChange={setYear}>
                        <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map(y => (
                            <SelectItem key={y} value={String(y)}>{y === 1 ? "1st" : y === 2 ? "2nd" : y === 3 ? "3rd" : `${y}th`} Year</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Semester</Label>
                      <Select value={semester} onValueChange={setSemester}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Annual</SelectItem>
                          <SelectItem value="1">1st Semester</SelectItem>
                          <SelectItem value="2">2nd Semester</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional information about this course..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pdf">Syllabus PDF</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="pdf"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {pdfFile && (
                        <Badge variant="outline" className="gap-1 shrink-0">
                          <FileText className="h-3 w-3" />
                          {pdfFile.name.slice(0, 20)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Sparkles className="inline h-3 w-3 mr-1" />
                      AI will automatically extract topics from the PDF
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={uploading || parsing} className="gap-1">
                      {parsing ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> AI Parsing...</>
                      ) : uploading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="h-4 w-4" /> Upload & Parse</>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Syllabi List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : syllabi.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No syllabi uploaded yet. Click "Upload Syllabus" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {syllabi.map((s) => (
            <Card key={s.id}>
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                {statusIcon(s.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{s.course_name}</span>
                    {s.credits && <Badge variant="outline" className="text-[10px]">{s.credits} CFU</Badge>}
                    <Badge variant="secondary" className="text-[10px]">Year {s.year}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.university_name}</p>
                </div>
                <Badge variant={s.status === "approved" ? "default" : "secondary"} className="text-[10px]">
                  {s.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{(s.topics as any[])?.length || 0} topics</span>
                {expandedId === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>

              <AnimatePresence>
                {expandedId === s.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="border-t pt-3 space-y-3">
                      {/* Topics */}
                      {(s.topics as any[])?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Extracted Topics
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {(s.topics as any[]).map((t: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {t.section && <span className="text-muted-foreground mr-1">{t.section}:</span>}
                                {t.name || t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {s.notes && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</h4>
                          <p className="text-sm text-foreground">{s.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={s.status === "approved" ? "outline" : "default"}
                          onClick={() => toggleStatus(s.id, s.status)}
                          className="gap-1"
                        >
                          {s.status === "approved" ? (
                            <><Clock className="h-3 w-3" /> Revoke</>
                          ) : (
                            <><CheckCircle className="h-3 w-3" /> Approve</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteSyllabus(s.id, s.pdf_path)}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SyllabusManager;

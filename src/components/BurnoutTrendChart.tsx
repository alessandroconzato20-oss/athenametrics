import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";

interface DayScore {
  date: string;
  label: string;
  burnout: number;
}

const BurnoutTrendChart = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<7 | 30>(7);
  const [data, setData] = useState<DayScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchScores();
  }, [user, range]);

  const fetchScores = async () => {
    setLoading(true);
    const fromDate = format(subDays(new Date(), range), "yyyy-MM-dd");

    const { data: scores, error } = await supabase
      .from("daily_scores")
      .select("score_date, burnout_risk")
      .gte("score_date", fromDate)
      .order("score_date", { ascending: true });

    if (error) {
      console.error("Failed to fetch scores:", error);
      setLoading(false);
      return;
    }

    // Fill missing dates with null-ish gaps
    const filled: DayScore[] = [];
    const scoreMap = new Map((scores || []).map((s) => [s.score_date, s.burnout_risk]));

    for (let i = range - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, "yyyy-MM-dd");
      const labelStr = range === 7 ? format(d, "EEE") : format(d, "MMM d");
      filled.push({
        date: dateStr,
        label: labelStr,
        burnout: scoreMap.get(dateStr) ?? -1,
      });
    }

    setData(filled);
    setLoading(false);
  };

  const validData = data.filter((d) => d.burnout >= 0);
  const avg = validData.length > 0 ? Math.round(validData.reduce((s, d) => s + d.burnout, 0) / validData.length) : null;

  const getRiskLabel = (val: number) => {
    if (val <= 30) return { text: "Low Risk", color: "text-score-cognitive" };
    if (val <= 60) return { text: "Moderate", color: "text-score-peak" };
    return { text: "High Risk", color: "text-score-burnout" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-3xl bg-card p-5 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Burnout Risk Trend</h3>
          {avg !== null && (
            <p className={`text-sm font-medium ${getRiskLabel(avg).color}`}>
              Avg: {avg}/100 · {getRiskLabel(avg).text}
            </p>
          )}
        </div>
        <div className="flex rounded-xl bg-muted p-0.5">
          <button
            onClick={() => setRange(7)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              range === 7 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            7D
          </button>
          <button
            onClick={() => setRange(30)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              range === 30 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            30D
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : validData.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl bg-muted/50">
          <p className="text-sm text-muted-foreground">No data yet. Scores are saved daily.</p>
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.filter((d) => d.burnout >= 0)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "13px",
                  boxShadow: "var(--shadow-elevated)",
                }}
                formatter={(value: number) => [`${value}/100`, "Burnout Risk"]}
              />
              <ReferenceLine y={60} stroke="hsl(var(--score-burnout))" strokeDasharray="4 4" strokeOpacity={0.4} />
              <ReferenceLine y={30} stroke="hsl(var(--score-cognitive))" strokeDasharray="4 4" strokeOpacity={0.4} />
              <Line
                type="monotone"
                dataKey="burnout"
                stroke="hsl(var(--score-burnout))"
                strokeWidth={2.5}
                dot={{ fill: "hsl(var(--score-burnout))", r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 bg-score-cognitive/40" style={{ borderTop: "2px dashed" }} />
          <span>Low (&lt;30)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 bg-score-burnout/40" style={{ borderTop: "2px dashed" }} />
          <span>High (&gt;60)</span>
        </div>
      </div>
    </motion.div>
  );
};

export default BurnoutTrendChart;

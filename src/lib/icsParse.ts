/**
 * Minimal .ics parser — extracts VEVENTs with SUMMARY, DTSTART, DTEND.
 * Good enough for academic calendar imports; doesn't unfold every RFC 5545 edge case.
 */
export interface IcsEvent {
  summary: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

const KEYWORDS = /(exam|assessment|semester|term|holiday|reading week|recess|break)/i;

function toIso(value: string): string | null {
  // Accepts 20260415, 20260415T090000, 20260415T090000Z
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function parseIcs(text: string): IcsEvent[] {
  // Unfold lines per RFC 5545: a single space at line start = continuation
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events: IcsEvent[] = [];
  let cur: Partial<IcsEvent> | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur?.summary && cur.start && cur.end && KEYWORDS.test(cur.summary)) {
        events.push(cur as IcsEvent);
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).split(";")[0];
      const val = line.slice(idx + 1);
      if (key === "SUMMARY") cur.summary = val;
      else if (key === "DTSTART") cur.start = toIso(val) ?? undefined;
      else if (key === "DTEND") cur.end = toIso(val) ?? undefined;
    }
  }
  return events;
}

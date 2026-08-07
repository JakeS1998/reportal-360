// Shared teaching-period helpers used by Class Management and My Classes.

const toMin = (t) => { if (!t) return 0; const [h, m] = t.split(":"); return parseInt(h, 10) * 60 + parseInt(m, 10); };
const pad = (n) => String(n).padStart(2, "0");
export const mmToHHMM = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const fmtTime = (t) => { if (!t) return ""; const [h, m] = t.split(":"); const hh = parseInt(h, 10); const ampm = hh >= 12 ? "PM" : "AM"; const h12 = hh % 12 || 12; return `${h12}:${m} ${ampm}`; };

// Build back-to-back teaching periods from the school timetable, excluding
// homeroom, break and lunch. Periods resume immediately after each blocked
// range (e.g. if homeroom ends at 9:00, the first class starts at 9:00), so
// there are no gaps. Falls back to hourly 8 AM–3 PM when no timetable is set.
// Returns [{ start, end, label }] with start/end in minutes from midnight.
export const buildTeachingSlots = (tt) => {
  const DAY_START = tt?.school_start ? toMin(tt.school_start) : 8 * 60;
  const DAY_END = tt?.school_end ? toMin(tt.school_end) : 15 * 60;
  const PERIOD = 60;
  const blocks = [
    tt?.homeroom_start && tt?.homeroom_end ? [toMin(tt.homeroom_start), toMin(tt.homeroom_end)] : null,
    tt?.break_start && tt?.break_end ? [toMin(tt.break_start), toMin(tt.break_end)] : null,
    tt?.lunch_start && tt?.lunch_end ? [toMin(tt.lunch_start), toMin(tt.lunch_end)] : null,
  ].filter(Boolean).sort((a, b) => a[0] - b[0]);
  // Advance a time past any block it falls inside (handles adjacent blocks too).
  const nextFree = (t) => {
    let cur = t;
    let changed = true;
    while (changed) {
      changed = false;
      for (const [bs, be] of blocks) {
        if (cur >= bs && cur < be) { cur = be; changed = true; }
      }
    }
    return cur;
  };
  const out = [];
  let cursor = nextFree(DAY_START);
  let idx = 0;
  while (cursor + PERIOD <= DAY_END) {
    const e = cursor + PERIOD;
    const hit = blocks.find(([bs, be]) => cursor < be && e > bs);
    if (hit) {
      // The period would cross a block — resume right after it.
      cursor = nextFree(hit[1]);
      continue;
    }
    idx++;
    out.push({ start: cursor, end: e, label: `Period ${idx} · ${fmtTime(mmToHHMM(cursor))}–${fmtTime(mmToHHMM(e))}` });
    cursor = e;
  }
  return out;
};
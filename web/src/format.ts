export function to12h(t: string | null | undefined): string {
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  let h = +m[1];
  const min = m[2];
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

function hhmmToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return +m[1] * 60 + +m[2];
}

/**
 * Minutes from `from` to `to` (both "HH:MM", same timezone). Handles the
 * midnight wrap: if `to` looks more than 12h before `from`, assume it's the
 * next calendar day.
 */
export function minutesUntil(
  from: string | null | undefined,
  to: string | null | undefined
): number | null {
  const a = hhmmToMinutes(from);
  const b = hhmmToMinutes(to);
  if (a == null || b == null) return null;
  let diff = b - a;
  if (diff < -720) diff += 1440;
  return diff;
}

export function formatDuration(min: number): string {
  if (min === 0) return "now";
  const sign = min < 0 ? " ago" : "";
  const abs = Math.abs(min);
  if (abs < 60) return `${abs} min${sign}`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return (m ? `${h} hr ${m} min` : `${h} hr`) + sign;
}

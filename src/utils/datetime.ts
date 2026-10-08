// Phnom Penh (UTC+7, no DST) date helpers.
// All "today"/"now" values in the app are derived from this timezone.

const TZ = 'Asia/Phnom_Penh';

function phParts(d: Date): string {
  // sv-SE locale formats as "YYYY-MM-DD HH:mm:ss"
  return d.toLocaleString('sv-SE', { timeZone: TZ, hour12: false });
}

/** 'YYYY-MM-DD HH:mm' in Phnom Penh time */
export function nowPhnomPenh(): string {
  return phParts(new Date()).slice(0, 16);
}

/** 'YYYY-MM-DD' in Phnom Penh time */
export function todayPhnomPenh(): string {
  return phParts(new Date()).slice(0, 10);
}

/** Format any Date as 'YYYY-MM-DD' in Phnom Penh time */
export function toPhnomPenhDate(d: Date): string {
  return phParts(d).slice(0, 10);
}

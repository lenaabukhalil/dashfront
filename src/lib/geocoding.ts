function dedupe(arr: string[]): string[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
}

export function isGenericKeyword(query: string): boolean {
  const t = (query ?? "").trim().toLowerCase();
  return /^(circle|street|road)$/i.test(t) || isCircleQuery(query);
}

export function isCircleQuery(query: string): boolean {
  const q = (query ?? "").trim();
  const lower = q.toLowerCase();
  const sixthCircleEnglish =
    /\b6\b.*circle/i.test(lower) ||
    /\b6th\b.*circle/i.test(lower) ||
    /sixth.*circle/i.test(lower) ||
    /\bcircle\s*(6|6th|sixth)\b/i.test(lower);
  const circleArabic = /الدوار|دوار/.test(q);
  return Boolean(sixthCircleEnglish || circleArabic);
}

export function buildQueryVariants(query: string): string[] {
  const q = (query ?? "").trim();
  if (!q) return [];

  const lower = q.toLowerCase();

  const sixthCircleArabic = /(الدوار\s*السادس|دوار\s*سادس|الدوار\s*٦|دوار\s*٦)/i.test(q);
  const circleIntent = isCircleQuery(q);
  if (sixthCircleArabic || circleIntent) {
    return dedupe([
      "Sixth Circle Amman",
      "6th Circle Amman",
      "Sixth Circle, Amman, Jordan",
      "Circle 6 Amman",
      "الدوار السادس عمان",
      "دوار سادس عمان",
      "الدوار ٦ عمان",
      "دوار ٦ عمان",
      q,
    ]);
  }

  const genericCircle = /^circle$/i.test(lower.trim()) || (lower.length <= 10 && /\bcircle\b/i.test(lower));
  if (genericCircle) {
    return dedupe([
      "Circle Amman",
      "Circle Jordan",
      "الدوار عمان",
      "دوار عمان الأردن",
      "Amman Circle",
      q,
    ]);
  }

  const shmeisaniMatch =
    /شميساني|شميْساني|الشميساني|shmeisani|al shmeisani/i.test(q) || /^شميساني$/i.test(lower.trim());
  if (shmeisaniMatch) {
    return dedupe([
      "شميساني عمان",
      "الشميساني عمان",
      "Shmeisani Amman",
      "Al Shmeisani Amman",
      "Shmeisani Jordan",
      q,
    ]);
  }

  const isLatin = /^[a-zA-Z0-9\s,.\-']+$/.test(q) || /[a-zA-Z]/.test(q);
  const variants: string[] = [q];

  if (isLatin) {
    if (!lower.includes("street") && !/\b(st|str|st\.)\b/i.test(q)) {
      variants.push(`${q} street`);
      variants.push(`${q} st`);
    }
    if (!lower.includes("amman")) variants.push(`${q}, Amman`);
    if (!lower.includes("jordan")) variants.push(`${q}, Amman, Jordan`);
  } else {
    if (!lower.includes("amman")) variants.push(`${q} Amman`);
    if (!lower.includes("jordan")) variants.push(`${q}, Amman, Jordan`);
    if (!lower.includes("street") && !/\b(st|str|st\.)\b/i.test(q)) variants.push(`${q} Street`);
  }

  if (/\bibn\b/i.test(q)) variants.push(q.replace(/\bibn\b/gi, "bin"));
  if (/\bbin\b/i.test(q) && !/\bibn\b/i.test(q)) variants.push(q.replace(/\bbin\b/gi, "ibn"));

  const ibnMayadahMatch = /ibn\s+mayadah|bin\s+mayadah/i.test(lower);
  if (ibnMayadahMatch) {
    variants.push("ابن ميادة");
    variants.push("شارع ابن ميادة");
    variants.push("Ibn Mayadah Street Amman");
    variants.push("Ibn Mayadah, Amman, Jordan");
  }

  return dedupe(variants);
}

export function parseCoordinates(input: string): [number, number] | null {
  const s = (input ?? "").toString().trim();
  if (!s) return null;
  const parts = s.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  return [lat, lng];
}

export function parseCoord(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

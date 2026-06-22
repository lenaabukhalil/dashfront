export function normalizeMobile(input: string, countryCode: number | string = 962): string {
  let digits = String(input ?? "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  const cc = String(countryCode);
  if (cc && digits.startsWith(cc)) digits = digits.slice(cc.length);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

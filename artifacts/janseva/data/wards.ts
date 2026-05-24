export const CITIZEN_WARDS = Array.from({ length: 29 }, (_, i) => `Ward ${i + 1}`);

export const NAGARSEVAK_WARDS = Array.from({ length: 29 }, (_, i) => [
  `Ward ${i + 1}A`,
  `Ward ${i + 1}B`,
]).flat();

export function getParentWard(subWard: string): string {
  return subWard.replace(/[AB]$/, "").trim();
}

export function getSubWards(parentWard: string): string[] {
  const num = parentWard.replace("Ward ", "").trim();
  return [`Ward ${num}A`, `Ward ${num}B`];
}

export function wardMatchesNagarsevak(complaintWard: string, nagarsevakWard: string): boolean {
  const complaintParent = complaintWard.replace(/[AB]$/, "").trim().toLowerCase();
  const nagarsevakParent = nagarsevakWard.replace(/[AB]$/, "").trim().toLowerCase();
  return complaintParent === nagarsevakParent;
}

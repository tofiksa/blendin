import type { ConfidenceBandAllowed } from "@/lib/newHireAnswers";

/** Delt mellom nyansatt-skjema og admin-forhåndsvisning. */
export const NEW_HIRE_CONFIDENCE_BANDS: Array<{
  value: ConfidenceBandAllowed;
  title: string;
  hint: string;
}> = [
  { value: "pct_0_25", title: "Liten tro", hint: "gjetting" },
  { value: "pct_26_50", title: "Litt usikker", hint: "åpent sinn" },
  { value: "pct_51_75", title: "Ganske trygg", hint: "kjennes igjen" },
  { value: "pct_76_100", title: "Veldig trygg", hint: "helt klart" },
];

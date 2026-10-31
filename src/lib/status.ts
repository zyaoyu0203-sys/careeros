import type { ApplicationStatus } from "@/lib/types";

export const STATUSES: { value: ApplicationStatus; label: string; tone: "neutral" | "blue" | "amber" | "rose" | "green" | "navy" }[] = [
  { value: "preparing", label: "Preparing", tone: "amber" },
  { value: "applied", label: "Applied", tone: "blue" },
  { value: "assessment", label: "Assessment / OA", tone: "navy" },
  { value: "interview", label: "Interview", tone: "navy" },
  { value: "offer", label: "Offer", tone: "green" },
  { value: "rejected", label: "Rejected", tone: "rose" },
  { value: "withdrawn", label: "Withdrawn", tone: "neutral" },
];

export const statusMeta = (s: ApplicationStatus) => STATUSES.find(x => x.value === s) ?? STATUSES[0];

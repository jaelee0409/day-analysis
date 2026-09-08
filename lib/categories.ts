import type { ActivityCategory, CategoryMeta } from "@/types/time";

/**
 * A ten-step muted spectrum at matched saturation. No single category should
 * shout over another when they sit side by side in a chart, so hues are
 * spread widely but chroma is held nearly constant.
 */
export const CATEGORIES: CategoryMeta[] = [
  { id: "development", phrase: "developing", label: "Development", color: "#4F6BA8", productive: true },
  { id: "study", phrase: "studying", label: "Study", color: "#6B5FA8", productive: true },
  { id: "work", phrase: "on work", label: "Work", color: "#3F6B72", productive: true },
  { id: "exercise", phrase: "exercising", label: "Exercise", color: "#A65A55", productive: false },
  { id: "food", phrase: "eating", label: "Food", color: "#A8834F", productive: false },
  { id: "hygiene", phrase: "washing", label: "Hygiene", color: "#54879A", productive: false },
  { id: "chores", phrase: "on chores", label: "Chores", color: "#7E6552", productive: false },
  { id: "sleep", phrase: "sleeping", label: "Sleep", color: "#5A6172", productive: false },
  { id: "leisure", phrase: "on leisure", label: "Leisure", color: "#9E5D8C", productive: false },
  { id: "social", phrase: "with people", label: "Social", color: "#4F8A7B", productive: false },
  { id: "transit", phrase: "in transit", label: "Transit", color: "#6E8A4F", productive: false },
  { id: "other", phrase: "on everything else", label: "Other", color: "#8A8A8A", productive: false },
];

export const ALL_CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function category(id: ActivityCategory): CategoryMeta {
  return BY_ID.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function isProductive(id: ActivityCategory): boolean {
  return category(id).productive;
}

/** Ordered as the canonical list, filtered to what the user has enabled. */
export function enabledCategories(enabled: ActivityCategory[]): CategoryMeta[] {
  const set = new Set(enabled);
  return CATEGORIES.filter((c) => set.has(c.id));
}

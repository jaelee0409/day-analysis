import type { ActivityCategory, TimeBlock } from "@/types/time";
import type { Locale } from "@/lib/i18n";

/**
 * Days other people are reported to keep, drawn on the same ruler as your own.
 *
 * Two honesty rules, because this is the one screen in the app whose content
 * did not come from the person reading it:
 *
 *   1. These are approximations assembled from public interviews and profiles.
 *      Nobody's day is this tidy, the sources disagree, and none of it is
 *      verified. The page says so rather than presenting them as records.
 *
 *   2. They are reference, not target. The app does not score you against
 *      them, congratulate you for matching one, or suggest you should.
 *
 * Text lives here rather than in `lib/i18n.ts` because it belongs to the data,
 * not to the interface. `npm run i18n:check` still holds it to both languages.
 */

export type Bilingual = { en: string; ko: string };

export type RoutineEntry = {
  /** Wall clock, "HH:mm", on the same 24-hour window the app uses. */
  start: string;
  end: string;
  category: ActivityCategory;
  title: Bilingual;
};

export type Routine = {
  id: string;
  /** A person's name is not translated. */
  name: string;
  role: Bilingual;
  note: Bilingual;
  entries: RoutineEntry[];
};

export const ROUTINES: Routine[] = [
  {
    id: "musk",
    name: "Elon Musk",
    role: { en: "Tesla, SpaceX", ko: "테슬라, 스페이스X" },
    note: {
      en: "Reported to sleep around six hours and to eat lunch in minutes.",
      ko: "수면은 여섯 시간 안팎, 점심은 몇 분 만에 끝낸다고 알려져 있습니다.",
    },
    entries: [
      { start: "00:00", end: "00:30", category: "work", title: { en: "Company updates", ko: "회사 업데이트" } },
      { start: "00:30", end: "07:00", category: "sleep", title: { en: "Sleep", ko: "수면" } },
      { start: "07:00", end: "07:30", category: "work", title: { en: "Triage email", ko: "메일 정리" } },
      { start: "07:30", end: "08:00", category: "work", title: { en: "Email block", ko: "메일 처리" } },
      { start: "08:00", end: "12:00", category: "work", title: { en: "Design reviews", ko: "설계 검토" } },
      { start: "12:00", end: "12:15", category: "food", title: { en: "Lunch", ko: "점심" } },
      { start: "12:15", end: "17:00", category: "work", title: { en: "Factory and team", ko: "공장과 팀" } },
      { start: "17:00", end: "20:00", category: "work", title: { en: "Across companies", ko: "여러 회사 업무" } },
      { start: "20:00", end: "00:00", category: "work", title: { en: "Company updates", ko: "회사 업데이트" } },
    ],
  },
  {
    id: "bezos",
    name: "Jeff Bezos",
    role: { en: "Amazon, Blue Origin", ko: "아마존, 블루 오리진" },
    note: {
      en: "Protects eight hours of sleep and keeps hard decisions before noon.",
      ko: "여덟 시간 수면을 지키고, 어려운 결정은 오전에 끝냅니다.",
    },
    entries: [
      { start: "00:00", end: "07:00", category: "sleep", title: { en: "Sleep", ko: "수면" } },
      { start: "07:00", end: "10:00", category: "leisure", title: { en: "Coffee and papers", ko: "커피와 신문" } },
      { start: "10:00", end: "12:00", category: "work", title: { en: "Hard decisions", ko: "중요한 결정" } },
      { start: "12:00", end: "13:00", category: "food", title: { en: "Lunch", ko: "점심" } },
      { start: "13:00", end: "17:00", category: "work", title: { en: "Meetings and reviews", ko: "회의와 검토" } },
      { start: "17:00", end: "18:00", category: "work", title: { en: "Lighter tasks", ko: "가벼운 업무" } },
      { start: "18:00", end: "19:00", category: "food", title: { en: "Dinner", ko: "저녁" } },
      { start: "19:00", end: "20:00", category: "social", title: { en: "Family, dishes", ko: "가족과 설거지" } },
      { start: "20:00", end: "23:00", category: "leisure", title: { en: "Wind down", ko: "휴식" } },
      { start: "23:00", end: "00:00", category: "sleep", title: { en: "Sleep", ko: "수면" } },
    ],
  },
  {
    id: "buffett",
    name: "Warren Buffett",
    role: { en: "Berkshire Hathaway", ko: "버크셔 해서웨이" },
    note: {
      en: "Spends most of the day reading, and keeps the calendar nearly empty.",
      ko: "하루의 대부분을 읽는 데 쓰고, 일정표는 거의 비워 둡니다.",
    },
    entries: [
      { start: "00:00", end: "06:45", category: "sleep", title: { en: "Sleep", ko: "수면" } },
      { start: "06:45", end: "07:15", category: "work", title: { en: "Check prices", ko: "주가 확인" } },
      { start: "07:15", end: "07:30", category: "transit", title: { en: "Breakfast run", ko: "아침 사러 가기" } },
      { start: "07:30", end: "08:00", category: "food", title: { en: "Breakfast", ko: "아침" } },
      { start: "08:00", end: "08:30", category: "study", title: { en: "Newspapers", ko: "신문" } },
      { start: "08:30", end: "12:00", category: "study", title: { en: "Annual reports", ko: "사업보고서" } },
      { start: "12:00", end: "13:00", category: "food", title: { en: "Lunch at the desk", ko: "책상에서 점심" } },
      { start: "13:00", end: "15:00", category: "study", title: { en: "Reading and thinking", ko: "읽고 생각하기" } },
      { start: "15:00", end: "17:00", category: "social", title: { en: "Bridge and calls", ko: "브리지와 통화" } },
      { start: "17:00", end: "19:00", category: "leisure", title: { en: "Ukulele, family", ko: "우쿨렐레와 가족" } },
      { start: "19:00", end: "20:00", category: "food", title: { en: "Dinner", ko: "저녁" } },
      { start: "20:00", end: "21:30", category: "leisure", title: { en: "Wind down", ko: "휴식" } },
      { start: "21:30", end: "00:00", category: "sleep", title: { en: "Sleep", ko: "수면" } },
    ],
  },
];

/**
 * A routine as blocks the timeline can draw. Ids are stable and prefixed so
 * they can never be mistaken for something the reader recorded.
 */
export function routineBlocks(routine: Routine, date: string, locale: Locale): TimeBlock[] {
  const stamp = "1970-01-01T00:00:00.000Z";
  return routine.entries.map((entry, index) => ({
    id: `routine-${routine.id}-${index}`,
    date,
    title: entry.title[locale],
    category: entry.category,
    startTime: entry.start,
    endTime: entry.end,
    interval: 15 as const,
    createdAt: stamp,
    updatedAt: stamp,
  }));
}

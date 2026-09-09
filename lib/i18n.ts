/**
 * Every word the app says, in both languages.
 *
 * A dictionary rather than a library: there are two locales and no routing to
 * do, so `next-intl` would be a dependency earning nothing. Keys are grouped
 * by where they appear.
 *
 * Two rules that matter more than the words:
 *
 *   1. Never assemble a sentence from fragments in component code. Korean puts
 *      its particles and verbs where English does not, so a sentence spliced
 *      together in JSX can only ever be right in one language. Each sentence
 *      is one entry, with {placeholders} the caller fills.
 *
 *   2. Numbers stay outside the string. `figure` values are formatted by
 *      `lib/time.ts` against the active locale and then substituted, so
 *      "3h 25m" and "3시간 25분" come from one code path.
 */

export const LOCALES = ["en", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABEL: Record<Locale, string> = { en: "English", ko: "한국어" };

type Entry = Record<Locale, string>;

export const DICTIONARY = {
  /* ---------------- chrome ---------------- */
  "nav.home": { en: "Home", ko: "홈" },
  "nav.dashboard": { en: "Dashboard", ko: "분석" },
  "nav.experiment": { en: "Experiment", ko: "실험" },
  "nav.routines": { en: "Routines", ko: "루틴" },
  "nav.settings": { en: "Settings", ko: "설정" },
  "nav.openMenu": { en: "Open menu", ko: "메뉴 열기" },
  "nav.closeMenu": { en: "Close menu", ko: "메뉴 닫기" },
  "app.name": { en: "Day Analysis", ko: "Day Analysis" },

  /* ---------------- sign in ---------------- */
  "auth.question": { en: "Where did your day go?", ko: "하루가 어디로 갔을까요?" },
  "auth.body": {
    en: "Sign in and your days follow you between this browser and your phone. Nothing is shared with anyone else.",
    ko: "로그인하면 기록이 이 브라우저와 휴대폰에서 함께 이어집니다. 다른 사람에게는 공개되지 않습니다.",
  },
  "auth.google": { en: "Continue with Google", ko: "Google로 계속하기" },
  "auth.googleBusy": { en: "Opening Google…", ko: "Google 여는 중…" },
  "auth.failed": { en: "Sign-in could not start.", ko: "로그인을 시작하지 못했습니다." },
  "auth.unconfigured": {
    en: "This copy is not connected to a database.",
    ko: "이 사이트는 데이터베이스에 연결되어 있지 않습니다.",
  },
  "auth.unconfiguredBody": {
    en: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then reload. See supabase/README.md.",
    ko: "NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 설정한 뒤 새로고침하세요. supabase/README.md를 참고하세요.",
  },

  /* ---------------- today ---------------- */
  "today.question": { en: "How did you spend your day?", ko: "오늘 하루를 어떻게 보내셨나요?" },
  "today.tracked": { en: "tracked", ko: "기록함" },
  "today.coverage": { en: "{percent}% of the day so far", ko: "지금까지 하루의 {percent}%" },
  "today.focused": { en: "focused work", ko: "집중 시간" },
  "today.sleep": { en: "sleep", ko: "수면" },
  "today.unaccounted": { en: "unaccounted", ko: "기록 없음" },
  "today.landed": { en: "Where the time landed", ko: "시간이 머문 곳" },
  "today.blocks": { en: "{count} blocks", ko: "블록 {count}개" },
  "today.block": { en: "{count} block", ko: "블록 {count}개" },
  "today.empty": {
    en: "Click any empty slot on the timeline to record your first block.",
    ko: "타임라인의 빈 칸을 눌러 첫 블록을 기록해 보세요.",
  },

  /* ---------------- date picker ---------------- */
  "calendar.open": { en: "Choose a day", ko: "날짜 고르기" },
  "calendar.previous": { en: "Previous month", ko: "이전 달" },
  "calendar.next": { en: "Next month", ko: "다음 달" },
  "calendar.today": { en: "Today", ko: "오늘" },
  "calendar.legend": { en: "A mark means you recorded something", ko: "표시가 있는 날은 기록이 있는 날입니다" },
  "calendar.trackedDay": { en: "{date}, recorded", ko: "{date}, 기록 있음" },
  "calendar.emptyDay": { en: "{date}, nothing recorded", ko: "{date}, 기록 없음" },

  /* ---------------- timeline ---------------- */
  "timeline.trackedIn": { en: "{duration} tracked", ko: "{duration} 기록함" },
  "timeline.nothingYet": { en: "nothing yet", ko: "아직 없음" },

  /* ---------------- recorder ---------------- */
  "recorder.create": { en: "Record time", ko: "시간 기록" },
  "recorder.edit": { en: "Edit activity", ko: "활동 수정" },
  "recorder.needsEnd": { en: "Set an end time", ko: "종료 시각을 정하세요" },
  "recorder.category": { en: "Category", ko: "분류" },
  "recorder.activity": { en: "Activity", ko: "활동" },
  "recorder.optional": { en: "Optional", ko: "선택 사항" },
  "recorder.start": { en: "Start", ko: "시작" },
  "recorder.end": { en: "End", ko: "종료" },
  "recorder.hint": { en: "Numbers pick a category. Enter saves.", ko: "숫자 키로 분류를 고르고 Enter로 저장합니다." },
  "recorder.pressHint": { en: "{label} (press {key})", ko: "{label} ({key} 키)" },
  "common.save": { en: "Save", ko: "저장" },
  "common.saveChanges": { en: "Save changes", ko: "변경 사항 저장" },
  "common.cancel": { en: "Cancel", ko: "취소" },
  "common.delete": { en: "Delete", ko: "삭제" },

  /* ---------------- to do ---------------- */
  "todo.title": { en: "To do", ko: "할 일" },
  "todo.left": { en: "{count} left", ko: "{count}개 남음" },
  "todo.allDone": { en: "all done", ko: "모두 완료" },
  "todo.placeholder": { en: "Something to remember", ko: "기억해 둘 일" },
  "todo.add": { en: "Add a reminder", ko: "할 일 추가" },
  "todo.clearDone": { en: "Clear {count} done", ko: "완료한 {count}개 지우기" },
  "todo.markDone": { en: "Mark {text} as done", ko: "{text} 완료로 표시" },
  "todo.markNotDone": { en: "Mark {text} as not done", ko: "{text} 미완료로 표시" },
  "todo.deleteItem": { en: "Delete {text}", ko: "{text} 삭제" },

  /* ---------------- dashboard ---------------- */
  "dashboard.question": { en: "What does the pattern say?", ko: "어떤 패턴이 보이나요?" },
  "dashboard.daysOf": { en: "{active} of {total} days recorded", ko: "{total}일 중 {active}일 기록함" },
  "dashboard.last7": { en: "Last 7 days", ko: "최근 7일" },
  "dashboard.last30": { en: "Last 30 days", ko: "최근 30일" },
  "dashboard.lifetime": { en: "All time", ko: "전체" },
  "dashboard.period": { en: "Period", ko: "기간" },
  "dashboard.overview": { en: "Overview", ko: "요약" },
  "dashboard.elapsed": { en: "{hours} elapsed", ko: "{hours} 경과" },
  "dashboard.perDay": { en: "per recorded day", ko: "기록한 하루 평균" },
  "dashboard.daysTracked": { en: "days tracked in all", ko: "지금까지 기록한 날" },
  "dist.total": { en: "Total", ko: "합계" },
  "dist.perDay": { en: "Per day", ko: "하루 평균" },
  "dist.scale": { en: "Scale", ko: "기준" },
  "dist.perDayAside": { en: "across {days} recorded days", ko: "기록한 {days}일 기준" },
  "dashboard.barNote": {
    en: "The bar spans every hour in the period. The dark run at the end is time you did not record.",
    ko: "막대는 기간 전체의 시간을 나타냅니다. 끝의 어두운 부분은 기록하지 않은 시간입니다.",
  },
  "dashboard.emptyTitle": { en: "Nothing to analyse yet", ko: "아직 분석할 것이 없습니다" },
  "dashboard.emptyBody": {
    en: "The dashboard reads whatever you have recorded. Track a day or two and the totals, weekly rhythm, and observations fill in on their own.",
    ko: "기록한 내용을 그대로 읽어 보여 줍니다. 하루 이틀만 기록해도 합계와 리듬, 관찰이 저절로 채워집니다.",
  },
  "dashboard.sevenQuestion": { en: "Where did the last seven days go?", ko: "지난 7일이 어디로 갔을까요?" },
  "dashboard.monthQuestion": { en: "Where did the last month go?", ko: "지난 한 달이 어디로 갔을까요?" },
  "dashboard.lifetimeQuestion": { en: "Where has all of it gone?", ko: "지금까지 시간이 어디로 갔을까요?" },

  /* ---------------- weekly chart ---------------- */
  "chart.focusedSeven": { en: "Focused work, last 7 recorded days", ko: "최근 기록한 7일의 집중 시간" },
  "chart.inTotal": { en: "{duration} in total", ko: "합계 {duration}" },
  "chart.legend": {
    en: "Solid marks focused work. The lighter run is everything else you recorded.",
    ko: "진한 부분이 집중 시간이고, 옅은 부분은 그 밖에 기록한 시간입니다.",
  },

  /* ---------------- rhythm ---------------- */
  "rhythm.title": { en: "Rhythm", ko: "리듬" },
  "rhythm.aside": { en: "± is how far a typical day drifts", ko: "±는 보통 하루가 흔들리는 폭입니다" },
  "rhythm.body": {
    en: "When things happen, rather than how long they take. The tighter the dots sit around the middle mark, the more regular the habit — each dot is one day.",
    ko: "얼마나 오래 했는지가 아니라 언제 했는지를 봅니다. 점이 가운데에 모여 있을수록 규칙적인 습관이고, 점 하나가 하루입니다.",
  },
  "rhythm.earlier": { en: "3h earlier", ko: "3시간 이르게" },
  "rhythm.typical": { en: "typical", ko: "보통" },
  "rhythm.later": { en: "3h later", ko: "3시간 늦게" },
  "rhythm.wake": { en: "Wake", ko: "기상" },
  "rhythm.bed": { en: "Bed", ko: "취침" },
  "rhythm.firstMeal": { en: "First meal", ko: "첫 끼" },
  "rhythm.night": { en: "Night's sleep", ko: "밤 수면" },
  "rhythm.nothingYet": { en: "nothing recorded yet", ko: "아직 기록이 없습니다" },
  "rhythm.needMore": { en: "{have} of {need} days needed", ko: "{need}일 중 {have}일 기록됨" },
  "rhythm.footnote": {
    en: "Wake is the end of the last sleep block before midday, bed the start of the first after it, and a night runs from one to the other. Hover a row to see its rule.",
    ko: "기상은 정오 이전 마지막 수면 블록이 끝난 시각, 취침은 정오 이후 첫 수면 블록이 시작된 시각이며, 밤 수면은 그 사이입니다. 각 줄에 마우스를 올리면 기준이 보입니다.",
  },
  "rhythm.ruleWake": {
    en: "The end of the last sleep block that finishes before midday.",
    ko: "정오 이전에 끝나는 마지막 수면 블록의 종료 시각입니다.",
  },
  "rhythm.ruleBed": {
    en: "The start of the first sleep block that begins after midday.",
    ko: "정오 이후에 시작하는 첫 수면 블록의 시작 시각입니다.",
  },
  "rhythm.ruleMeal": {
    en: "The start of the earliest block recorded as food.",
    ko: "식사로 기록한 블록 중 가장 이른 것의 시작 시각입니다.",
  },
  "rhythm.ruleNight": {
    en: "From the previous evening's bed time to that morning's wake.",
    ko: "전날 밤 취침 시각부터 그날 아침 기상 시각까지입니다.",
  },

  /* ---------------- insights ---------------- */
  "insight.topCategory": {
    en: "of your waking time went to {category}.",
    ko: "깨어 있는 시간 중 {category}에 쓴 비율입니다.",
  },
  "insight.focus": {
    en: "was your longest uninterrupted focus session.",
    ko: "가장 길게 이어진 집중 시간입니다.",
  },
  "insight.coverage": { en: "of the day so far is accounted for.", ko: "지금까지 하루 중 기록한 비율입니다." },
  "insight.ratio": {
    en: "more time on focused work than on leisure.",
    ko: "여가보다 집중한 일에 더 쓴 배수입니다.",
  },
  "insight.switches": { en: "times you changed what you were doing.", ko: "번 하던 일을 바꿨습니다." },
  "insight.aboveAverage": { en: "above your recent average for focused work.", ko: "최근 집중 시간 평균보다 많습니다." },
  "insight.belowAverage": { en: "below your recent average for focused work.", ko: "최근 집중 시간 평균보다 적습니다." },
  "insight.rangeTop": {
    en: "of everything you recorded went to {category}.",
    ko: "기록한 시간 전체 중 {category}이(가) 차지한 비율입니다.",
  },
  "insight.rangeCoverage": { en: "of the period is accounted for.", ko: "이 기간 중 기록한 비율입니다." },
  "insight.rangeAverage": {
    en: "of focused work on an average recorded day.",
    ko: "기록한 하루 평균 집중 시간입니다.",
  },
  "insight.rangeLongest": {
    en: "was the longest unbroken stretch of focus in the period.",
    ko: "이 기간 중 가장 길게 이어진 집중 시간입니다.",
  },
  "insight.emptyDay": {
    en: "Record a block or two and the answer builds itself.",
    ko: "블록을 몇 개만 기록해도 답이 스스로 채워집니다.",
  },

  /* ---------------- routines ---------------- */
  "routines.context": { en: "Days other people are reported to keep", ko: "다른 사람들이 지낸다고 알려진 하루" },
  "routines.question": { en: "How do other people build a day?", ko: "다른 사람들은 하루를 어떻게 짜나요?" },
  "routines.pick": { en: "Whose day", ko: "누구의 하루" },
  "routines.theirDay": { en: "Their day", ko: "그 사람의 하루" },
  "routines.breakdown": { en: "How it divides", ko: "어떻게 나뉘나" },
  "routines.compare": { en: "Beside your own", ko: "내 하루와 나란히" },
  "routines.yours": { en: "Yours", ko: "나" },
  "routines.theirs": { en: "Theirs", ko: "그 사람" },
  "routines.yourAverage": {
    en: "Your average across {days} recorded days, against their reported day.",
    ko: "기록한 {days}일의 평균과 알려진 하루를 나란히 둔 것입니다.",
  },
  "routines.needDays": {
    en: "Record a couple of days and your own averages appear here beside theirs.",
    ko: "며칠만 기록하면 내 평균이 여기 나란히 나타납니다.",
  },
  "routines.caveat": {
    en: "Assembled from public interviews and profiles, not from records. Sources disagree, nobody's day is this tidy, and none of this is a target — it is here to compare against, nothing more.",
    ko: "공개된 인터뷰와 기사에서 모은 것이며 실제 기록이 아닙니다. 출처마다 내용이 다르고, 누구의 하루도 이렇게 정돈되어 있지 않습니다. 목표가 아니라 견주어 볼 대상일 뿐입니다.",
  },

  /* ---------------- settings ---------------- */
  "settings.label": { en: "Settings", ko: "설정" },
  "settings.question": { en: "How should the day be measured?", ko: "하루를 어떻게 측정할까요?" },
  "settings.language": { en: "Language", ko: "언어" },
  "settings.languageBody": {
    en: "Applies to this device. Dates, durations and every label follow it.",
    ko: "이 기기에만 적용됩니다. 날짜와 시간, 모든 문구가 함께 바뀝니다.",
  },
  "settings.interval": { en: "Time interval", ko: "시간 간격" },
  "settings.slotsADay": { en: "{count} slots a day", ko: "하루 {count}칸" },
  "settings.intervalBody": {
    en: "The resolution of the timeline grid. Finer grids record more precisely; coarser grids are quicker to fill in.",
    ko: "타임라인 격자의 단위입니다. 촘촘할수록 정확하게 기록하고, 넓을수록 빠르게 채울 수 있습니다.",
  },
  "settings.minutes": { en: "{count} min", ko: "{count}분" },
  "settings.dayStart": { en: "Day starts at", ko: "하루 시작" },
  "settings.runsTo": { en: "runs to {clock}", ko: "{clock}까지" },
  "settings.dayStartBody": {
    en: "Where your timeline begins. Set it to when you usually wake, and a late night stays attached to the day it belongs to instead of splitting across midnight.",
    ko: "타임라인이 시작하는 시각입니다. 보통 일어나는 시각으로 맞추면, 늦은 밤이 자정에서 잘리지 않고 그 하루에 함께 남습니다.",
  },
  "settings.dayRange": { en: "{start} to {end}, {total} in all", ko: "{start}부터 {end}까지, 모두 {total}" },
  "settings.categories": { en: "Categories", ko: "분류" },
  "settings.categoriesOn": { en: "{on} of {total} on", ko: "{total}개 중 {on}개 사용" },
  "settings.categoriesBody": {
    en: "Turn off what you never use. Fewer choices in the recorder means a faster entry. Time already recorded under a category you switch off is kept and still counted.",
    ko: "쓰지 않는 분류는 꺼 두세요. 선택지가 적을수록 기록이 빨라집니다. 끈 분류로 이미 기록한 시간은 그대로 남고 합계에도 계속 반영됩니다.",
  },
  "settings.countsAsFocused": { en: "counts as focused work", ko: "집중 시간에 포함" },
  "settings.enableCategory": { en: "Enable {label}", ko: "{label} 사용" },
  "settings.account": { en: "Account", ko: "계정" },
  "settings.accountBody": {
    en: "Your days live in your account, so this browser and your phone show the same record. Nobody else can read it.",
    ko: "기록은 계정에 저장되므로 이 브라우저와 휴대폰이 같은 내용을 보여 줍니다. 다른 사람은 볼 수 없습니다.",
  },
  "settings.signOut": { en: "Sign out", ko: "로그아웃" },
  "settings.data": { en: "Your data", ko: "내 데이터" },
  "settings.dataBody": {
    en: "Export a copy whenever you want one of your own. Importing replaces everything in your account, so it restores a backup rather than merging one in.",
    ko: "언제든 사본을 내려받을 수 있습니다. 가져오기는 계정의 내용을 통째로 바꾸므로, 합치는 것이 아니라 백업을 되돌리는 동작입니다.",
  },
  "settings.export": { en: "Export JSON", ko: "JSON 내보내기" },
  "settings.import": { en: "Import JSON", ko: "JSON 가져오기" },
  "settings.clear": { en: "Clear all data", ko: "모든 데이터 삭제" },
  "settings.deleteEverything": { en: "Delete everything", ko: "전부 삭제" },
  "settings.keepIt": { en: "Keep it", ko: "그대로 두기" },
  "settings.importSummary": {
    en: "That file holds {blocks} across {days}{extra}. Importing replaces everything in your account.",
    ko: "이 파일에는 {days}에 걸친 {blocks}이(가) 들어 있습니다{extra}. 가져오면 계정의 내용이 모두 바뀝니다.",
  },
  "settings.importBlocks": { en: "{count} blocks", ko: "블록 {count}개" },
  "settings.importDays": { en: "{count} days", ko: "{count}일" },
  "settings.importTodos": { en: ", {count} reminders", ko: ", 할 일 {count}개" },
  "settings.importRuns": { en: ", {count} experiment runs", ko: ", 실험 {count}회" },
  "settings.replaceEverything": { en: "Replace everything", ko: "전부 바꾸기" },
  "settings.unreadable": { en: "That file could not be read.", ko: "파일을 읽지 못했습니다." },

  /* ---------------- local archive ---------------- */
  "archive.title": { en: "Days recorded in this browser", ko: "이 브라우저에 남아 있는 기록" },
  "archive.body": {
    en: "This browser still holds {blocks} across {days} from before you signed in. Move them into your account and they follow you to your phone. Anything already in the account is replaced.",
    ko: "로그인 전에 이 브라우저에 기록해 둔 {days}에 걸친 {blocks}이(가) 남아 있습니다. 계정으로 옮기면 휴대폰에서도 이어서 볼 수 있습니다. 계정에 있던 내용은 대체됩니다.",
  },
  "archive.move": { en: "Move them in", ko: "계정으로 옮기기" },
  "archive.moving": { en: "Moving…", ko: "옮기는 중…" },
  "archive.notNow": { en: "Not now", ko: "나중에" },
  "archive.failed": { en: "The upload did not finish.", ko: "옮기지 못했습니다." },
  "archive.footnote": {
    en: "Dismissing leaves the browser copy untouched, so nothing is lost either way.",
    ko: "나중에를 눌러도 브라우저의 사본은 그대로 남으므로 잃는 것은 없습니다.",
  },

  /* ---------------- experiment ---------------- */
  "experiment.context": { en: "A running experiment on your own attention", ko: "내 집중력에 대한 실험" },
  "experiment.question": { en: "Which block size actually holds you?", ko: "어떤 길이가 집중을 붙잡나요?" },
  "experiment.run": { en: "Run a block", ko: "블록 실행" },
  "experiment.running": { en: "running", ko: "진행 중" },
  "experiment.ready": { en: "ready", ko: "준비됨" },
  "experiment.blockSize": { en: "Block size", ko: "블록 길이" },
  "experiment.holding": { en: "Stay on one thing until the block runs out.", ko: "블록이 끝날 때까지 한 가지에만 집중하세요." },
  "experiment.idle": {
    en: "Pick a size, start, and see whether you make it to the end.",
    ko: "길이를 고르고 시작해서 끝까지 갈 수 있는지 확인해 보세요.",
  },
  "experiment.start": { en: "Start block", ko: "시작" },
  "experiment.distracted": { en: "I got distracted", ko: "집중이 끊겼어요" },
  "experiment.held": { en: "You held {minutes} minutes to the end.", ko: "{minutes}분을 끝까지 지켰습니다." },
  "experiment.interrupted": { en: "Interrupted after {duration}.", ko: "{duration} 만에 끊겼습니다." },
  "experiment.results": { en: "Your results", ko: "결과" },
  "experiment.sessions": { en: "{count} sessions", ko: "{count}회" },
  "experiment.session": { en: "{count} session", ko: "{count}회" },
  "experiment.noTimeYet": { en: "no time yet", ko: "아직 없음" },
  "experiment.heldTotal": { en: "{duration} held", ko: "{duration} 유지" },
  "experiment.rateNote": {
    en: "Focus rate is the share of blocks you carried to the end without calling an interruption.",
    ko: "집중률은 중간에 끊기지 않고 끝까지 간 블록의 비율입니다.",
  },
  "experiment.recent": { en: "Recent runs", ko: "최근 실행" },
  "experiment.recentAside": { en: "most recent first", ko: "최근 순" },
  "experiment.heldToEnd": { en: "held to the end", ko: "끝까지 유지" },
  "experiment.stoppedAt": { en: "stopped at {duration}", ko: "{duration}에 중단" },
  "experiment.suggests": { en: "What it suggests", ko: "무엇을 말해 주나" },
  "experiment.best": {
    en: "{size}-minute blocks hold you best so far, finishing {rate}% of the time across {runs} runs.",
    ko: "지금까지는 {size}분 블록이 가장 잘 맞습니다. {runs}회 중 {rate}%를 끝까지 마쳤습니다.",
  },
  "experiment.needMore": {
    en: "Run at least three blocks at two different sizes and a comparison appears here.",
    ko: "서로 다른 두 길이로 세 번씩 실행하면 비교가 나타납니다.",
  },
  "experiment.clear": { en: "Clear experiment data", ko: "실험 기록 지우기" },

  /* ---------------- categories ---------------- */
  "category.development.label": { en: "Development", ko: "개발" },
  "category.development.phrase": { en: "developing", ko: "개발" },
  "category.study.label": { en: "Study", ko: "공부" },
  "category.study.phrase": { en: "studying", ko: "공부" },
  "category.work.label": { en: "Work", ko: "업무" },
  "category.work.phrase": { en: "on work", ko: "업무" },
  "category.exercise.label": { en: "Exercise", ko: "운동" },
  "category.exercise.phrase": { en: "exercising", ko: "운동" },
  "category.food.label": { en: "Food", ko: "식사" },
  "category.food.phrase": { en: "eating", ko: "식사" },
  "category.hygiene.label": { en: "Hygiene", ko: "위생" },
  "category.hygiene.phrase": { en: "washing", ko: "씻기" },
  "category.chores.label": { en: "Chores", ko: "집안일" },
  "category.chores.phrase": { en: "on chores", ko: "집안일" },
  "category.sleep.label": { en: "Sleep", ko: "수면" },
  "category.sleep.phrase": { en: "sleeping", ko: "수면" },
  "category.leisure.label": { en: "Leisure", ko: "여가" },
  "category.leisure.phrase": { en: "on leisure", ko: "여가" },
  "category.social.label": { en: "Social", ko: "사교" },
  "category.social.phrase": { en: "with people", ko: "사람들과" },
  "category.transit.label": { en: "Transit", ko: "이동" },
  "category.transit.phrase": { en: "in transit", ko: "이동" },
  "category.other.label": { en: "Other", ko: "기타" },
  "category.other.phrase": { en: "on everything else", ko: "그 밖의 일" },
} satisfies Record<string, Entry>;

export type MessageKey = keyof typeof DICTIONARY;

/** Fills {placeholders}. Missing values are left visible rather than blanked. */
export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const entry = DICTIONARY[key] as Entry | undefined;
  let text = entry ? entry[locale] : key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

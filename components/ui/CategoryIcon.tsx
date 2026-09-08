import type { ActivityCategory } from "@/types/time";

/**
 * One drawn glyph per category, at a single stroke weight, in currentColor.
 *
 * These replaced colour emoji: emoji arrive at whatever weight and palette the
 * operating system feels like, which made them the loudest marks on a page
 * built to keep every category equal. A line glyph inherits the colour of
 * whatever it sits in, so a category hue reaches it only inside a data mark.
 */
const PATHS: Record<ActivityCategory, React.ReactNode> = {
  // Angle brackets: writing code.
  development: <path d="M6 4.5 2.5 8l3.5 3.5M10 4.5 13.5 8 10 11.5" />,
  // An open book.
  study: <path d="M8 4.5v8M8 4.5C6.8 3.6 4.9 3.4 2.5 3.8v7.6c2.4-.4 4.3-.2 5.5.7 1.2-.9 3.1-1.1 5.5-.7V3.8c-2.4-.4-4.3-.2-5.5.7Z" />,
  // A case with a handle.
  work: (
    <>
      <rect x="2.5" y="5.5" width="11" height="7.5" rx="1.2" />
      <path d="M6 5.5V4.2c0-.4.3-.7.7-.7h2.6c.4 0 .7.3.7.7v1.3" />
    </>
  ),
  // A loaded bar.
  exercise: <path d="M3 6v4M5 4.5v7M11 4.5v7M13 6v4M5 8h6" />,
  // Fork and knife.
  food: <path d="M4.5 3v4a1.5 1.5 0 0 0 3 0V3M6 7v6M11.5 3c-.9 0-1.5 1-1.5 2.5S10.6 8 11.5 8V3Zm0 5v5" />,
  // A droplet.
  hygiene: <path d="M8 2.6c2.3 2.6 3.6 4.6 3.6 6.3a3.6 3.6 0 0 1-7.2 0c0-1.7 1.3-3.7 3.6-6.3Z" />,
  // A brush. A basket read as the work briefcase at this size.
  chores: (
    <>
      <path d="M8 2.2v4.6" />
      <path d="M5.4 6.8h5.2l.8 6.6H4.6Z" />
      <path d="M7 9.6v3.8M9 9.6v3.8" />
    </>
  ),
  // A crescent.
  sleep: <path d="M12.5 9.6A5 5 0 0 1 6.4 3.5a5 5 0 1 0 6.1 6.1Z" />,
  // A play triangle.
  leisure: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="m6.6 5.8 3.4 2.2-3.4 2.2V5.8Z" />
    </>
  ),
  // Two people.
  social: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <path d="M2.5 13c.4-2 1.8-3 3.5-3s3.1 1 3.5 3M10.6 4.2a2.2 2.2 0 0 1 0 4.2M11.5 10.3c1.1.4 1.8 1.3 2 2.7" />
    </>
  ),
  // A route between two points.
  transit: (
    <>
      <circle cx="4" cy="12" r="1.6" />
      <circle cx="12" cy="4" r="1.6" />
      <path d="M5.6 12h3.1a2.6 2.6 0 0 0 0-5.2H7.3a2.6 2.6 0 0 1 0-5.2h.1" />
    </>
  ),
  // Everything else.
  other: <circle cx="8" cy="8" r="4.5" />,
};

export function CategoryIcon({
  id,
  size = 14,
  className = "",
}: {
  id: ActivityCategory;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}

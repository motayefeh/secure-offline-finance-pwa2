import type { SVGProps } from "react";

export type IconName =
  | "wallet"
  | "bank"
  | "chart"
  | "receipt"
  | "sliders"
  | "lock"
  | "shield"
  | "shieldcheck"
  | "plus"
  | "trash"
  | "pencil"
  | "eye"
  | "eyeoff"
  | "download"
  | "upload"
  | "sun"
  | "moon"
  | "x"
  | "check"
  | "alert"
  | "search"
  | "calendar"
  | "clock"
  | "logout"
  | "chevronleft"
  | "chevrondown"
  | "copy"
  | "sparkles"
  | "menu"
  | "phone"
  | "card"
  | "trend"
  | "refresh"
  | "file"
  | "target"
  | "key"
  | "info";

const P: Record<IconName, string> = {
  wallet:
    "M3 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9h18M16.5 13.5h.01",
  bank: "M3 21h18M5 21V10M19 21V10M3 10l9-6 9 6M9 21v-7M15 21v-7",
  chart: "M4 20V10M10 20V4M16 20v-6M21 20H3",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5",
  sliders: "M4 7h6M14 7h6M4 12h10M18 12h2M4 17h3M11 17h9M10 5v4M16 10v4M7 15v4",
  lock: "M5 11h14v9H5zM8 11V8a4 4 0 0 1 8 0v3M12 15v2",
  shield: "M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z",
  shieldcheck: "M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6zM9 12l2 2 4-4",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M9 7V4.5h6V7M6.5 7l.9 13h9.2l.9-13M10 11v6M14 11v6",
  pencil: "M4 20h4L19 9l-4-4L4 16zM14 5l4 4",
  eye: "M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  eyeoff: "M3 3l18 18M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6s-1.3 2.2-3.6 4M6.2 8.2C3.6 9.9 2 12 2 12s3.6 6.5 10 6.5c1.4 0 2.7-.3 3.8-.7",
  download: "M12 4v10M8 10l4 4 4-4M4 19h16",
  upload: "M12 20V9M8 13l4-4 4 4M4 5h16",
  sun: "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19",
  moon: "M20 14.5A8.5 8.5 0 1 1 10 3.4a7 7 0 0 0 10 11.1z",
  x: "M6 6l12 12M18 6L6 18",
  check: "M4.5 12.5l5 5 10-11",
  alert: "M12 4l9 16H3zM12 10v4.5M12 17.2h.01",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.2-4.2",
  calendar: "M4 6h16v15H4zM4 11h16M8.5 3v4M15.5 3v4",
  clock: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h9",
  chevronleft: "M15 5l-7 7 7 7",
  chevrondown: "M5 9l7 7 7-7",
  copy: "M9 9h11v11H9zM15 5H4v11",
  sparkles:
    "M12 3l1.7 4.8L18.5 9.5 13.7 11.2 12 16l-1.7-4.8L5.5 9.5l4.8-1.7zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  menu: "M4 7h16M4 12h16M4 17h16",
  phone: "M4.5 5c0 8 6.5 14.5 14.5 14.5l1-4-4-1.5-1.5 1.5c-2.8-1.1-4.9-3.2-6-6L10 8 8.5 4z",
  card: "M3 6.5h18v11H3zM3 10.5h18M6.5 14.5h3",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  refresh: "M4.5 12a7.5 7.5 0 0 1 12.8-5.3L20 9M20 4v5h-5M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4 15M4 20v-5h5",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
  target: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1z",
  key: "M8 18a4 4 0 1 1 3.5-6L20 4M17 7l2.5 2.5M14.5 9.5 17 12",
  info: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 11v5.5M12 7.8h.01",
};

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={P[name]} />
    </svg>
  );
}

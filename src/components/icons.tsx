import type { SVGProps } from "react";

// Lightweight inline line-icons (no icon-library dependency). Stroke uses
// currentColor so callers control the color via text-*.
type P = SVGProps<SVGSVGElement>;

function Svg({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      {children}
    </svg>
  );
}

export const IconPhone = (p: P) => (
  <Svg {...p}>
    <path d="M5 4h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </Svg>
);
export const IconSheet = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="14" rx="1.5" />
    <path d="M4 10h16M10 5v14" />
  </Svg>
);
export const IconEye = (p: P) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.6" />
  </Svg>
);
export const IconReroute = (p: P) => (
  <Svg {...p}>
    <path d="M6 5v6a4 4 0 0 0 4 4h7" />
    <path d="M14 11l4 4-4 4" />
  </Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Svg>
);
export const IconHourglass = (p: P) => (
  <Svg {...p}>
    <path d="M6 4h12M6 20h12" />
    <path d="M8 4c0 4 4 4 4 8s-4 4-4 8M16 4c0 4-4 4-4 8s4 4 4 8" />
  </Svg>
);
export const IconFileWarning = (p: P) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M12 11v3M12 17h.01" />
  </Svg>
);
export const IconClipboard = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="3.5" rx="1" />
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
  </Svg>
);
export const IconTarget = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
);
export const IconFileCheck = (p: P) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 15l2 2 4-4" />
  </Svg>
);
export const IconActivity = (p: P) => (
  <Svg {...p}>
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </Svg>
);
export const IconBuilding = (p: P) => (
  <Svg {...p}>
    <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
    <path d="M8 7h2M12 7h2M8 11h2M12 11h2M9 21v-4h4v4" />
  </Svg>
);
export const IconHospital = (p: P) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V9l7-3 7 3v12" />
    <path d="M12 10v4M10 12h4" />
  </Svg>
);
export const IconNetwork = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="5" r="2" />
    <circle cx="5" cy="19" r="2" />
    <circle cx="19" cy="19" r="2" />
    <path d="M12 7v3M10.5 13l-4 4M13.5 13l4 4" />
  </Svg>
);
export const IconLayers = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </Svg>
);

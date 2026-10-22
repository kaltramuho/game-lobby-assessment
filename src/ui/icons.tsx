import type { ReactNode } from 'react';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function IconSearch() {
  return (
    <Svg>
      <circle cx="11" cy="11" r="6" {...stroke} />
      <path d="M16 16.5 20 20.5" {...stroke} />
    </Svg>
  );
}

export function IconSun() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="3.2" {...stroke} />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" {...stroke} />
    </Svg>
  );
}

export function IconMoon() {
  return (
    <Svg>
      <path d="M15.5 3.8A7.2 7.2 0 1 0 20.2 14 5.6 5.6 0 0 1 15.5 3.8Z" {...stroke} />
    </Svg>
  );
}

export function IconStar({ filled }: { filled: boolean }) {
  return (
    <Svg>
      <path
        d="m12 3.6 2.2 4.6 5 .7-3.6 3.5.9 5.1L12 15.2 7.5 17.5l.9-5.1L4.8 8.9l5-.7L12 3.6Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconClose() {
  return (
    <Svg>
      <path d="M6 6l12 12M18 6 6 18" {...stroke} />
    </Svg>
  );
}

export function IconPause() {
  return (
    <Svg>
      <path d="M8 5.5v13M16 5.5v13" {...stroke} />
    </Svg>
  );
}

export function IconPlay() {
  return (
    <Svg>
      <path d="M8 5.5v13l11-6.5L8 5.5Z" {...stroke} />
    </Svg>
  );
}

export function IconChevron({ dir }: { dir: 'left' | 'right' }) {
  const d = dir === 'left' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6';
  return (
    <Svg>
      <path d={d} {...stroke} />
    </Svg>
  );
}

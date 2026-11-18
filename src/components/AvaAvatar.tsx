import type { AvatarStatus } from '../lib/types';

interface Props {
  status: AvatarStatus;
}

const STATUS_LABEL: Record<AvatarStatus, string> = {
  waiting: 'Waiting',
  listening: 'Listening',
  processing: 'Processing',
  speaking: 'Speaking',
  completed: 'Completed',
  paused: 'Paused',
};

export function AvaAvatar({ status }: Props) {
  return (
    <div className={`ava ava--${status}`} aria-hidden="true">
      <div className="ava__glow" />
      <div className="ava__ring" />
      <svg className="ava__face" viewBox="0 0 200 220" role="img">
        <title>Ava</title>
        <defs>
          <linearGradient id="avaSkin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F3D2B3" />
            <stop offset="100%" stopColor="#E2B48C" />
          </linearGradient>
          <linearGradient id="avaHair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A2A22" />
            <stop offset="100%" stopColor="#1C1410" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="198" rx="48" ry="14" fill="rgba(0,0,0,0.18)" />
        <path
          d="M42 98c0-42 28-74 58-74s58 32 58 74c0 8-1 16-3 24H45c-2-8-3-16-3-24z"
          fill="url(#avaHair)"
        />
        <path
          d="M52 168c8-18 26-28 48-28s40 10 48 28c-12 22-32 34-48 34s-36-12-48-34z"
          fill="#2A4A42"
        />
        <circle cx="100" cy="100" r="56" fill="url(#avaSkin)" />
        <path
          d="M48 78c8-28 28-46 52-46 18 0 34 8 44 22-10-4-22-4-34 2-18 8-34 8-50 4 0-4-4-8-12-8v26z"
          fill="url(#avaHair)"
        />
        <path
          d="M44 92c6-6 14-10 22-8 4 10 2 22-4 30-10-4-18-12-18-22z"
          fill="url(#avaHair)"
        />
        <path
          d="M156 92c-6-6-14-10-22-8-4 10-2 22 4 30 10-4 18-12 18-22z"
          fill="url(#avaHair)"
        />
        <circle className="ava__eye ava__eye--l" cx="78" cy="100" r="5.5" fill="#1C1612" />
        <circle className="ava__eye ava__eye--r" cx="122" cy="100" r="5.5" fill="#1C1612" />
        <path
          className="ava__mouth"
          d="M86 124c6 10 22 10 28 0"
          fill="none"
          stroke="#8A4B3A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="64" cy="114" r="6" fill="rgba(214,120,100,0.35)" />
        <circle cx="136" cy="114" r="6" fill="rgba(214,120,100,0.35)" />
      </svg>
      <div className="ava__waveform" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="ava__status-label">{STATUS_LABEL[status]}</p>
    </div>
  );
}

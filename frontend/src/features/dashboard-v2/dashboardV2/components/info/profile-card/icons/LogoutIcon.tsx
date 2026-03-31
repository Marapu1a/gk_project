export function LogoutIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1" y="1" width="50" height="50" rx="11" stroke="currentColor" strokeWidth="2" />
      <path
        d="M36 13.6845C36 12.9255 35.1875 12.4432 34.5211 12.8066L26.0423 17.4315C25.3998 17.7819 25 18.4554 25 19.1873V42.3155C25 43.0745 25.8125 43.5568 26.4789 43.1934L35.4789 38.2843C35.8001 38.109 36 37.7723 36 37.4064V13.6845Z"
        fill="currentColor"
      />
      <path
        d="M16 13C16 12.4477 16.4477 12 17 12H35C35.5523 12 36 12.4477 36 13V37C36 37.5523 35.5523 38 35 38H34C33.4477 38 33 37.5523 33 37V26.5V15H19V37C19 37.5523 18.5523 38 18 38H17C16.4477 38 16 37.5523 16 37V13Z"
        fill="currentColor"
      />
    </svg>
  );
}

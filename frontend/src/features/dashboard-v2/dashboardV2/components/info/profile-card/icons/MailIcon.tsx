export function MailIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1" y="1" width="50" height="50" rx="11" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14.6 17.9C14.6 16.7954 15.4954 15.9 16.6 15.9H35.4C36.5046 15.9 37.4 16.7954 37.4 17.9V34.1C37.4 35.2046 36.5046 36.1 35.4 36.1H16.6C15.4954 36.1 14.6 35.2046 14.6 34.1V17.9Z"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M16.8 18.6L25.0866 26.0579C25.6067 26.526 26.3933 26.526 26.9134 26.0579L35.2 18.6"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

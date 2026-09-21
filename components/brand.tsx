import Link from 'next/link';
export function BranchMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="29"
      height="31"
      viewBox="0 0 32 34"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 31V17L3 4M16 17L29 4M16 17V3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Logo() {
  return (
    <Link className="brand" href="/" aria-label="Dyntree Automotive home">
      <BranchMark />
      <span>DYNTREE</span>
    </Link>
  );
}
export const prototypeNotice =
  'Prototype vehicle shown. Production design and specifications may change.';
export const driveNotice =
  'Dyntree Drive requires an attentive driver and does not make the vehicle autonomous.';
export function PrototypeNote({ className = '' }: { className?: string }) {
  return <p className={`prototype-note ${className}`}>{prototypeNotice}</p>;
}

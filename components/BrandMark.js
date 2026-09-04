export default function BrandMark() {
  return (
    <span className="brandMark" aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        <rect width="64" height="64" fill="#123047" />
        <path d="M20 15v34" stroke="#f8fbfc" strokeWidth="7" strokeLinecap="round" />
        <path d="M44 15v34" stroke="#f8fbfc" strokeWidth="7" strokeLinecap="round" />
        <path d="M20 32h20" stroke="#f8fbfc" strokeWidth="7" strokeLinecap="round" />
        <path d="M32 32 50 14 42 41Z" fill="#3aafa9" />
        <circle cx="32" cy="32" r="5.2" fill="#123047" />
        <circle cx="32" cy="32" r="2.2" fill="#f8fbfc" />
      </svg>
    </span>
  );
}

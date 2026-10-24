/** The eight-rayed sun from the Philippine flag, drawn as an SVG. */
export function Sun({ className, title }: { className?: string; title?: string }) {
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const angle = i * 45;
    rays.push(
      <g key={i} transform={`rotate(${angle} 50 50)`}>
        <polygon points="50,2 46.5,24 53.5,24" />
        <polygon points="50,6 49,24 51,24" transform="rotate(-12 50 50)" />
        <polygon points="50,6 49,24 51,24" transform="rotate(12 50 50)" />
      </g>,
    );
  }
  return (
    <svg viewBox="0 0 100 100" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <g fill="currentColor">
        {rays}
        <circle cx="50" cy="50" r="20" />
      </g>
    </svg>
  );
}

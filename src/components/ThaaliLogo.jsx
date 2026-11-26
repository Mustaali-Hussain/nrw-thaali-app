/*
 * ThaaliLogo — the app's brand icon
 *
 * A thaali (food bowl) drawn as SVG.
 * Used on the Login screen inside a green rounded square,
 * and potentially on a splash/loading screen.
 *
 * Props:
 *   size    — SVG width/height (default 48)
 *   stroke  — stroke color (default "white")
 */

export default function ThaaliLogo({ size = 48, stroke = 'white' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="18" stroke={stroke} strokeWidth="2.5" fill="none" />
      <ellipse cx="24" cy="20" rx="12" ry="8" stroke={stroke} strokeWidth="2" fill="none" />
      <path
        d="M16 28 C18 34,30 34,32 28"
        stroke={stroke}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

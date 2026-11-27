/*
 * ThaaliLogo — the app's brand icon
 *
 * Plate with fork and knife drawn as SVG.
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
            {/* Plate (circle) */}
            <circle cx="24" cy="24" r="14" stroke={stroke} strokeWidth="2" fill="none" />
            <circle cx="24" cy="24" r="10" stroke={stroke} strokeWidth="1.2" fill="none" opacity="0.5" />

            {/* Fork (left) */}
            <g stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
                <line x1="5" y1="10" x2="5" y2="22" />
                <line x1="2" y1="10" x2="2" y2="16" />
                <line x1="5" y1="10" x2="5" y2="16" />
                <line x1="8" y1="10" x2="8" y2="16" />
                <line x1="2" y1="16" x2="8" y2="16" />
                <line x1="5" y1="22" x2="5" y2="38" />
            </g>

            {/* Knife (right) */}
            <g stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M43 10 C43 10, 45 14, 45 18 C45 20, 44 21, 43 22 L43 38" fill="none" />
                <line x1="43" y1="10" x2="43" y2="22" />
            </g>
        </svg>
    )
}
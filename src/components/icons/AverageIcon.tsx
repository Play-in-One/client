import type { IconBaseProps } from 'react-icons';

/** "x̄" (x-barra): símbolo estadístico de la media, para el gauge del
 *  promedio. No hay un ícono de marca para "promedio" en ningún set —
 *  se dibuja a mano, mismo trazo que los íconos de `react-icons`. */
export default function AverageIcon({ size = '1em', color = 'currentColor', title, ...rest }: IconBaseProps) {
    return (
        <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth={0}
            viewBox="0 0 24 24"
            height={size}
            width={size}
            color={color}
            {...rest}
        >
            {title && <title>{title}</title>}
            <line x1="7" y1="5" x2="17" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <text x="12" y="19" textAnchor="middle" fontSize="14" fontWeight="700" stroke="none">x</text>
        </svg>
    );
}

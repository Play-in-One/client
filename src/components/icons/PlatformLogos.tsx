/**
 * Logos "de marca" para consolas sin ícono fiel en las librerías de terceros
 * (@tabler/icons-react, react-icons). Mismo contrato que los demás íconos usados
 * en platformIconMap (GameDetailClient.tsx): monocromos vía currentColor, para
 * seguir siendo legibles tanto en el estado `filled` (fondo de color de marca)
 * como `subtle` (fondo gris) del selector de plataforma.
 */

interface LogoProps {
    size?: number;
    className?: string;
}

export function WiiULogo({ size = 18, className }: LogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M2,8 C2,4.686 4.686,2 8,2 H16 C19.314,2 22,4.686 22,8 V16 C22,19.314 19.314,22 16,22 H8 C4.686,22 2,19.314 2,16 Z
                   M7,6 V13 C7,15.761 9.239,18 12,18 C14.761,18 17,15.761 17,13 V6 L14.5,6 V13 C14.5,14.381 13.381,15.5 12,15.5 C10.619,15.5 9.5,14.381 9.5,13 V6 Z"
            />
        </svg>
    );
}

/** Logo oficial "Wii" con círculo (public/platform-logos/wii.png) aplicado como máscara CSS
 * para poder teñirlo con currentColor igual que los íconos vectoriales del mapa. */
export function WiiLogo({ size = 18, className }: LogoProps) {
    const maskImage = 'url(/platform-logos/wii.png)';
    return (
        <span
            className={className}
            role="img"
            aria-label="Wii"
            style={{
                display: 'inline-block',
                width: size,
                height: size,
                backgroundColor: 'currentColor',
                WebkitMaskImage: maskImage,
                maskImage,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
            }}
        />
    );
}

export function NintendoDSLogo({ size = 18, className }: LogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <rect x="6" y="4" width="12" height="7" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <rect x="6" y="13" width="12" height="7" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
    );
}

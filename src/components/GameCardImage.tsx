'use client';

import RemoteImage from './RemoteImage';
import { useStaffProductPreviews } from '@/context/StaffProductPreviewContext';
import type { Game, ProductPreview, ProductPreviewFilters } from '@/lib/types';

function CardPhoto({ image, alt, sizes, priority, contain = false, hover = false }: {
    image: string | null; alt: string; sizes: string; priority?: boolean; contain?: boolean; hover?: boolean;
}) {
    return <RemoteImage src={image} alt={alt} sizes={sizes} priority={priority}
        style={{ objectFit: contain ? 'contain' : 'cover', transition: hover ? 'transform 0.5s' : undefined }}
        onMouseEnter={hover ? e => { e.currentTarget.style.transform = 'scale(1.05)'; } : undefined}
        onMouseLeave={hover ? e => { e.currentTarget.style.transform = ''; } : undefined} />;
}

export default function GameCardImage({ game, previewFilters, sizes, priority, hover }: {
    game: Game; previewFilters?: ProductPreviewFilters; sizes: string; priority?: boolean; hover?: boolean;
}) {
    const previews = useStaffProductPreviews(game, previewFilters);
    if (!previews?.length) return <CardPhoto image={game.image || null} alt={game.name} sizes={sizes} priority={priority} hover={hover} />;
    return <div data-product-image-grid={game.id} style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 2, padding: 2, background: 'var(--mantine-color-body)' }}>
        {Array.from({ length: 4 }, (_, index) => {
            const product: ProductPreview | undefined = previews[index];
            return <div key={product?.product_id ?? `empty-${index}`} data-product-id={product?.product_id} style={{ position: 'relative', minWidth: 0, minHeight: 0 }}>
                {product && <CardPhoto image={product.image} alt={`${game.name} — producto ${index + 1}`} sizes={sizes} priority={priority} contain />}
            </div>;
        })}
    </div>;
}

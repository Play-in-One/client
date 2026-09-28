'use client';

import RatingGauge from './RatingGauge';
import AverageIcon from './icons/AverageIcon';

/** Envuelve `RatingGauge` con el ícono de promedio para el rating de una
 *  saga. Existe porque `RatingGauge` es cliente y `AverageIcon` (una
 *  función) no puede cruzar el límite servidor→cliente como prop directa
 *  desde `SagaCard`/`saga/[slug]/page.tsx`, que son Server Components. */
export default function SagaRatingGauge({
    value,
    testId,
    size,
}: {
    value: number;
    testId: string;
    size?: number;
}) {
    return (
        <RatingGauge
            value={value}
            label="Calificación promedio"
            icon={AverageIcon}
            testId={testId}
            size={size}
        />
    );
}

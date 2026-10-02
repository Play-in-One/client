'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import {
    Box,
    Button,
    Collapse,
    Group,
    NativeSelect,
    Stack,
    Text,
    UnstyledButton,
} from '@mantine/core';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { useApp } from '@/context/AppContext';
import ChileRegionMap from '@/components/chile/ChileRegionMap';
import InfoHint from '@/components/InfoHint';
import { CHILE_REGIONS, isRegionCode, regionName, type RegionCode } from '@/lib/chile-regions';

const REGION_OPTIONS = [
    { value: '', label: 'Todas las regiones' },
    ...CHILE_REGIONS.map((r) => ({ value: r.code, label: r.name })),
];

/* Dentro del Menu/Drawer del navbar, las flechas y el Tab los consume el menú
   para moverse entre sus items, y el foco se iba del mapa y del selector. Se
   deja pasar solo Escape, que sí debe cerrar el menú. */
const keepKeysInside = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') e.stopPropagation();
};

/** Filtros de UBICACIÓN de la tienda: los botones de internacionales y
 *  nacionales y el mapa de regiones.
 *
 *  Son tres controles independientes (internacional, nacional, región) y una
 *  oferta se ve si su tienda pasa el de SU categoría; ver `isSellerVisible`.
 *  Con una región elegida solo se ven las tiendas físicas de esa región. */
export default function LocationFilter({ size = 'xs' }: { size?: 'xs' | 'sm' }) {
    const {
        includeInternational, setIncludeInternational,
        includeNational, setIncludeNational,
        region, setRegion,
    } = useApp();
    const [regionOpen, setRegionOpen] = useState(false);
    const [hovered, setHovered] = useState<RegionCode | null>(null);
    const regionPanelId = useId();

    const readout = hovered ?? region;

    return (
        <Stack gap="sm">
            {/* Internacionales arriba y nacionales debajo, con el mismo aspecto: son
                el mismo tipo de control (incluir o no una categoría de tiendas). */}
            <Stack gap={6}>
                <Group gap={6} wrap="nowrap">
                    <Button
                        size={size}
                        radius="xl"
                        color="primaryRed"
                        variant={includeInternational ? 'filled' : 'light'}
                        aria-pressed={includeInternational}
                        onClick={() => setIncludeInternational(!includeInternational)}
                        leftSection={includeInternational ? <IconCheck size={14} stroke={3} /> : undefined}
                        style={{ flex: 1 }}
                    >
                        Tiendas internacionales
                    </Button>
                    <InfoHint label="¿Qué hacen las tiendas internacionales?" position="bottom-end">
                        Tiendas de importación, con sede fuera de Chile. Al apagarlas, sus ofertas
                        dejan de contar en toda la plataforma.
                    </InfoHint>
                </Group>
                <Group gap={6} wrap="nowrap">
                    <Button
                        size={size}
                        radius="xl"
                        color="primaryRed"
                        variant={includeNational ? 'filled' : 'light'}
                        aria-pressed={includeNational}
                        onClick={() => setIncludeNational(!includeNational)}
                        leftSection={includeNational ? <IconCheck size={14} stroke={3} /> : undefined}
                        style={{ flex: 1 }}
                    >
                        Tiendas nacionales
                    </Button>
                    <InfoHint label="¿Qué significa Nacional?" position="bottom-end">
                        Tiendas que operan en varias regiones del país, así que no pertenecen
                        a una sola. Al apagarlas, sus ofertas dejan de contar en toda la
                        plataforma.
                    </InfoHint>
                </Group>
            </Stack>

            <div>
                <Group justify="space-between" wrap="nowrap" gap={4}>
                    <Group gap={4} wrap="nowrap">
                        {/* El título también abre el desplegable (comodidad con el ratón);
                            el botón accesible es el de la derecha. */}
                        <UnstyledButton
                            onClick={() => setRegionOpen((o) => !o)}
                            onKeyDown={keepKeysInside}
                            tabIndex={-1}
                            aria-hidden
                        >
                            <Text fz="sm" fw={500}>Región</Text>
                        </UnstyledButton>
                        <InfoHint label="¿Qué hace la región?">
                            Con una región elegida solo ves las tiendas físicas de esa región.
                            Las nacionales e internacionales se controlan aparte.
                        </InfoHint>
                    </Group>
                    <UnstyledButton
                        onClick={() => setRegionOpen((o) => !o)}
                        aria-expanded={regionOpen}
                        aria-controls={regionPanelId}
                        aria-label={`Región: ${region ? regionName(region) : 'Todas'}`}
                        onKeyDown={keepKeysInside}
                        style={{ flex: 1, minWidth: 0 }}
                    >
                        <Group justify="flex-end" gap={4} wrap="nowrap">
                            <Text fz="sm" c={region ? 'primaryRed' : 'dimmed'} fw={region ? 600 : 400}>
                                {region ? regionName(region) : 'Todas'}
                            </Text>
                            <IconChevronDown
                                size={16}
                                style={{
                                    transform: regionOpen ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.2s',
                                }}
                            />
                        </Group>
                    </UnstyledButton>
                </Group>

                <Collapse in={regionOpen} id={regionPanelId}>
                    <Box onKeyDown={keepKeysInside} pt="xs">
                        <Group align="flex-start" wrap="nowrap" gap="md">
                            <ChileRegionMap value={region} onChange={setRegion} onHoverChange={setHovered} />
                            <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                                <Text fz="sm" fw={600} mih={20} aria-live="polite">
                                    {readout ? regionName(readout) : 'Elige una región'}
                                </Text>
                                {/* El mapa solo no alcanza: las regiones del centro miden
                                    pocos píxeles y con el dedo cuesta acertar. El selector es
                                    la vía precisa y la de teclado; edita el mismo valor. */}
                                <NativeSelect
                                    size="xs"
                                    aria-label="Región de las tiendas"
                                    data={REGION_OPTIONS}
                                    value={region ?? ''}
                                    onChange={(e) => {
                                        const v = e.currentTarget.value;
                                        setRegion(isRegionCode(v) ? v : null);
                                    }}
                                />
                                {region && (
                                    <Button
                                        variant="subtle"
                                        color="gray"
                                        size="compact-xs"
                                        onClick={() => setRegion(null)}
                                        style={{ alignSelf: 'flex-start' }}
                                    >
                                        Quitar región
                                    </Button>
                                )}
                            </Stack>
                        </Group>
                    </Box>
                </Collapse>
            </div>
        </Stack>
    );
}

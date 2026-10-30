'use client';

import type { ReactNode } from 'react';
import { IconStarFilled } from '@tabler/icons-react';
import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Container,
    Group,
    SimpleGrid,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import {
    brand,
    chart,
    darkScale,
    decorative,
    elevation,
    onDark,
    ratingStar,
    scrim,
    semantic,
    type SemanticColor,
} from '@/lib/colors';
import RatingPill from '@/components/RatingPill';
import ComponentsGallery from './ComponentsGallery';

/* Referencia viva del sistema de diseño: pinta los tokens de `lib/colors.ts` y
   el tema tal como los resuelve el navegador, en el esquema de color activo.
   No tiene datos ni acciones, así que no exige sesión; la ruta solo no se
   enlaza ni se indexa. Si un token nuevo no aparece aquí, nadie lo va a usar. */

const SHADES = Array.from({ length: 10 }, (_, i) => i);
const SEMANTIC_USES: Record<SemanticColor, string> = {
    danger: 'Errores, acciones destructivas, campo obligatorio',
    success: 'Confirmaciones, guardado, ahorro',
    warning: 'Falta algo para continuar',
    caution: 'Acciones de efecto amplio, datos incompletos',
    info: 'Información neutra',
};

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <Stack gap="sm" component="section">
            <div>
                <Title order={2} fz="h3">{title}</Title>
                <Text c="dimmed" fz="sm">{description}</Text>
            </div>
            {children}
        </Stack>
    );
}

function Swatch({ color, label, value }: { color: string; label: string; value?: string }) {
    return (
        <Stack gap="2xs">
            <Box h={48} style={{ background: color, borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-default-border)' }} />
            <Text fz="xs" fw={600}>{label}</Text>
            {value && <Text fz="xs" c="dimmed" ff="monospace">{value}</Text>}
        </Stack>
    );
}

function PaletteRow({ name }: { name: string }) {
    return (
        <SimpleGrid cols={{ base: 5, sm: 10 }} spacing="xs">
            {SHADES.map((i) => (
                <Swatch key={i} color={`var(--mantine-color-${name}-${i})`} label={`${name}.${i}`} />
            ))}
        </SimpleGrid>
    );
}

export default function DesignSystemClient() {
    const semanticNames = Object.keys(semantic) as SemanticColor[];
    return (
        <Container size="lg" py="xl">
            <Stack gap={48}>
                <div>
                    <Title order={1}>Sistema de diseño</Title>
                    <Text c="dimmed">
                        Tokens de <code>src/lib/colors.ts</code> y del tema de Mantine (<code>src/theme.ts</code>).
                        Cambia el tema del sitio para ver el modo oscuro.
                    </Text>
                </div>

                <Section title="Marca" description={`primaryRed — «Signature Red». El índice 5 (${brand.primary}) es el color primario.`}>
                    <PaletteRow name="primaryRed" />
                    <Group>
                        <Button>Primario</Button>
                        <Button variant="light">Light</Button>
                        <Button variant="outline">Outline</Button>
                        <Button style={{ boxShadow: decorative.primaryButtonShadow }}>Con realce</Button>
                    </Group>
                </Section>

                <Section title="Estado" description="Alias semánticos: color=&quot;danger&quot;, c=&quot;success&quot;… Nunca red/green para un estado: el rojo de la marca y el de un error no son el mismo.">
                    {semanticNames.map((name) => (
                        <Stack key={name} gap="xs">
                            <Group gap="xs">
                                <Text fw={700} ff="monospace">{name}</Text>
                                <Text fz="sm" c="dimmed">— {SEMANTIC_USES[name]} (base: {semantic[name]})</Text>
                            </Group>
                            <PaletteRow name={name} />
                            <Group>
                                <Badge color={name}>Badge</Badge>
                                <Badge color={name} variant="light">Light</Badge>
                                <Button color={name} variant="light" size="xs">Botón</Button>
                                <Text c={name} fz="sm">Texto de estado</Text>
                            </Group>
                        </Stack>
                    ))}
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <Alert color="danger" title="Error">No pudimos cargar esta página.</Alert>
                        <Alert color="success" title="Guardado">Cambios guardados.</Alert>
                        <Alert color="warning" title="Falta algo">Necesitas iniciar sesión.</Alert>
                        <Alert color="caution" title="Datos incompletos">Faltan los datos de hoy.</Alert>
                    </SimpleGrid>
                </Section>

                <Section title="Valoración" description="Dos formas, según el fondo. Sobre una portada, RatingPill: velo, estrella con el color de la nota (ratingColor, tono 4) y número blanco; se prueba sobre el peor caso, una portada blanca. Sobre la tarjeta, estrella dorada (ratingStar, más oscura en claro) y número con el color del texto.">
                    <Group gap="xl" align="flex-start">
                        <Stack gap="xs">
                            <Text fz="xs" c="dimmed">Sobre portada (GameCard)</Text>
                            <Group gap="xs">
                                {[2.5, 5, 7, 9].map((v) => (
                                    <Box key={v} p="sm" style={{ background: 'var(--mantine-color-white)', borderRadius: 'var(--mantine-radius-sm)', border: '1px solid var(--mantine-color-default-border)' }}>
                                        <RatingPill value={v} />
                                    </Box>
                                ))}
                            </Group>
                        </Stack>
                        <Stack gap="xs">
                            <Text fz="xs" c="dimmed">Sobre la tarjeta (destacada)</Text>
                            <Group gap="lg">
                                {[2.5, 9].map((v) => (
                                    <Group key={v} gap="2xs" wrap="nowrap">
                                        <IconStarFilled size={14} style={{ color: `light-dark(${ratingStar.light}, ${ratingStar.dark})` }} />
                                        <Text fz="sm" fw={700}>{v}</Text>
                                    </Group>
                                ))}
                            </Group>
                        </Stack>
                    </Group>
                </Section>

                <Section title="Superficies oscuras" description={`Escala dark propia (fondo ${darkScale[7]}). 0–3 texto, 4–9 superficies.`}>
                    <SimpleGrid cols={{ base: 5, sm: 10 }} spacing="xs">
                        {darkScale.map((value, i) => <Swatch key={i} color={value} label={`dark.${i}`} value={value} />)}
                    </SimpleGrid>
                </Section>

                <Section title="Sobre fondo oscuro" description="onDark: texto y líneas para superficies oscuras en los dos temas (tarjeta de mejor precio, aviso de cookies).">
                    <Box
                        p="xl"
                        style={{
                            borderRadius: 'var(--mantine-radius-xl)',
                            background: `linear-gradient(135deg, light-dark(${decorative.bestPriceCardGradient.light.from}, ${decorative.bestPriceCardGradient.dark.from}), light-dark(${decorative.bestPriceCardGradient.light.to}, ${decorative.bestPriceCardGradient.dark.to}))`,
                            border: `1px solid ${onDark.border}`,
                        }}
                    >
                        <Text c={onDark.text} fz={32} fw={800}>$19.990</Text>
                        <Text c={onDark.textSecondary}>textSecondary — Vendido por Tienda</Text>
                        <Text c={onDark.success} fz="sm">success — confirmaciones</Text>
                        <Text c={onDark.separator} fz="sm">separator — separadores</Text>
                    </Box>
                </Section>

                <Section title="Elevación" description="elevation.*: hover de tarjetas y elementos flotantes. Las sombras shadow=&quot;xs…xl&quot; siguen siendo las de Mantine.">
                    <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="lg">
                        {Object.entries(elevation).map(([name, shadow]) => (
                            <Box key={name} p="md" h={90} style={{ boxShadow: shadow, borderRadius: 'var(--mantine-radius-lg)', background: 'var(--mantine-color-body)' }}>
                                <Text fz="sm" fw={600} ff="monospace">{name}</Text>
                            </Box>
                        ))}
                    </SimpleGrid>
                </Section>

                <Section title="Tarjetas" description="Card sale con borde y radio lg por defecto (theme.components). Una tarjeta clicable lleva className=&quot;pio-lift&quot;: sube 2px y gana la sombra elevation.hover; sin desplazamiento con movimiento reducido y nada en táctil.">
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                        <Card p="lg">
                            <Text fw={600}>Card</Text>
                            <Text fz="sm" c="dimmed">Por defecto: borde + radio lg.</Text>
                        </Card>
                        <Card p="lg" shadow="sm" className="pio-lift" style={{ cursor: 'pointer' }}>
                            <Text fw={600}>Card clicable</Text>
                            <Text fz="sm" c="dimmed">shadow=&quot;sm&quot; + pio-lift. Pasa el cursor.</Text>
                        </Card>
                        <Card p="lg" radius="md">
                            <Text fw={600}>Card de staff</Text>
                            <Text fz="sm" c="dimmed">radius=&quot;md&quot; explícito.</Text>
                        </Card>
                    </SimpleGrid>
                </Section>

                <Section title="Velos sobre imagen" description="scrim.*: fondo de iconos y cifras encima de una portada.">
                    <Group>
                        {Object.entries(scrim).map(([name, value]) => (
                            <Box key={name} p="md" style={{ background: `linear-gradient(${value}, ${value}), var(--mantine-color-primaryRed-3)`, borderRadius: 'var(--mantine-radius-sm)' }}>
                                <Text c={onDark.text} fz="sm" ff="monospace">{name}</Text>
                            </Box>
                        ))}
                    </Group>
                </Section>

                <Section title="Gráficos" description="chart.series: tonos con nombre para series con identidad. chart.channels: grupos de canal, validados en claro y oscuro.">
                    <SimpleGrid cols={{ base: 4, sm: 7, md: 13 }} spacing="xs">
                        {Object.entries(chart.series).map(([name, value]) => <Swatch key={name} color={value} label={name} />)}
                    </SimpleGrid>
                    <SimpleGrid cols={{ base: 3, sm: 6 }} spacing="xs">
                        {Object.entries(chart.channels).map(([name, value]) => (
                            <Swatch key={name} color={`light-dark(${value.light}, ${value.dark})`} label={name} />
                        ))}
                    </SimpleGrid>
                </Section>

                <Section title="Tipografía" description="Poppins (next/font) para todo; títulos con el mismo peso de familia.">
                    <Stack gap="2xs">
                        {([1, 2, 3, 4] as const).map((order) => <Title key={order} order={order}>Título h{order}</Title>)}
                        {(['3xl', '2xl'] as const).map((size) => <Text key={size} fz={size} fw={800}>$19.990 · {size}</Text>)}
                        {(['xl', 'lg', 'md', 'sm', 'xs'] as const).map((size) => <Text key={size} fz={size}>Texto {size}</Text>)}
                        <Group gap="md" mt="xs">
                            {[500, 600, 700, 800].map((w) => <Text key={w} fw={w}>Aa {w}</Text>)}
                            <Text fw={900} c="dimmed">900 solo logotipo</Text>
                        </Group>
                        <Text c="dimmed">Texto dimmed — secundario</Text>
                    </Stack>
                </Section>

                <Section title="Espaciado" description="Escala de Mantine (xs–xl) más 2xs, entre iconos y etiquetas, y section, entre secciones de una página.">
                    <Stack gap="xs">
                        {(['2xs', 'xs', 'sm', 'md', 'lg', 'xl', 'section'] as const).map((size) => (
                            <Group key={size} gap="sm">
                                <Text fz="sm" ff="monospace" w={70}>{size}</Text>
                                <Box h={12} w={`var(--mantine-spacing-${size})`} style={{ background: 'var(--mantine-color-primaryRed-5)', borderRadius: 2 }} />
                            </Group>
                        ))}
                    </Stack>
                </Section>

                <Section title="Radios" description="defaultRadius: md. Tarjetas en lg, superficies destacadas en xl.">
                    <Group>
                        {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((r) => (
                            <Box key={r} w={72} h={72} style={{ borderRadius: `var(--mantine-radius-${r})`, border: '2px solid var(--mantine-color-primaryRed-5)' }}>
                                <Text ta="center" lh="68px" fz="sm" ff="monospace">{r}</Text>
                            </Box>
                        ))}
                    </Group>
                </Section>

                <Section title="Componentes" description="Los componentes compartidos del sitio, con datos reales de la API.">
                    <ComponentsGallery />
                </Section>
            </Stack>
        </Container>
    );
}

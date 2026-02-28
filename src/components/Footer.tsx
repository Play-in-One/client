'use client';

import {
    Box,
    Container,
    Group,
    Text,
    Anchor,
    SimpleGrid,
    TextInput,
    Button,
    Stack,
} from '@mantine/core';

const YEAR = new Date().getFullYear();

export default function Footer() {
    return (
        <Box
            component="footer"
            pt={60}
            pb={32}
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
            <Container size="lg">
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
                    {/* Brand */}
                    <Stack gap="sm">
                        <Group gap={8}>
                            <Box
                                w={32}
                                h={32}
                                style={{
                                    borderRadius: '50%',
                                    background: 'var(--mantine-color-primaryRed-5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: 12,
                                }}
                            >
                                P1
                            </Box>
                            <Text fw={700} fz="lg">
                                Play<Text span c="var(--mantine-color-primaryRed-5)">in</Text>One
                            </Text>
                        </Group>
                        <Text fz="sm" c="dimmed" maw={280}>
                            La forma más inteligente de comprar videojuegos en Chile. Rastreamos precios para que
                            tú solo te preocupes de jugar.
                        </Text>
                    </Stack>

                    {/* Categorías */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Categorías</Text>
                        <Anchor href="/platform/ps5" fz="sm" c="dimmed" underline="never">PlayStation 5</Anchor>
                        <Anchor href="/platform/switch" fz="sm" c="dimmed" underline="never">Nintendo Switch</Anchor>
                        <Anchor href="/platform/xbox" fz="sm" c="dimmed" underline="never">Xbox Series X</Anchor>
                        <Anchor href="/platform/pc" fz="sm" c="dimmed" underline="never">Juegos PC</Anchor>
                    </Stack>

                    {/* Empresa */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Empresa</Text>
                        <Anchor href="#" fz="sm" c="dimmed" underline="never">Sobre Nosotros</Anchor>
                        <Anchor href="#" fz="sm" c="dimmed" underline="never">Contacto</Anchor>
                        <Anchor href="#" fz="sm" c="dimmed" underline="never">Blog</Anchor>
                        <Anchor href="#" fz="sm" c="dimmed" underline="never">Términos de Servicio</Anchor>
                    </Stack>

                    {/* Newsletter */}
                    <Stack gap="xs">
                        <Text fw={700} mb={4}>Suscríbete</Text>
                        <Text fz="sm" c="dimmed">Recibe las mejores ofertas en tu correo.</Text>
                        <Group gap={0}>
                            <TextInput
                                placeholder="Tu email"
                                size="sm"
                                radius="md"
                                style={{ flex: 1 }}
                                styles={{
                                    input: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
                                }}
                            />
                            <Button
                                size="sm"
                                radius="md"
                                color="primaryRed"
                                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                            >
                                OK
                            </Button>
                        </Group>
                    </Stack>
                </SimpleGrid>

                {/* Bottom bar */}
                <Group
                    justify="space-between"
                    mt={48}
                    pt={24}
                    style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                >
                    <Text fz="xs" c="dimmed">
                        © {YEAR} Play in One Chile. Todos los derechos reservados.
                    </Text>
                </Group>
            </Container>
        </Box>
    );
}

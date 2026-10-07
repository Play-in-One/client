'use client';

import { useRef, useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useAdmin } from '@/context/AdminContext';
import { ApiError, deleteGame, deleteProduct } from '@/lib/api';

export default function DeleteCatalogButton({ kind, id, name, disabled = false, onDeleted }: {
    kind: 'game' | 'product';
    id: number;
    name: string;
    disabled?: boolean;
    onDeleted: () => void;
}) {
    const { isAdmin } = useAdmin();
    const [opened, setOpened] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const deleting = useRef(false);
    const label = kind === 'game' ? 'Eliminar juego' : 'Eliminar producto';

    const confirm = async () => {
        if (deleting.current || !isAdmin || disabled) return;
        deleting.current = true;
        setBusy(true);
        setError(null);
        try {
            if (kind === 'game') await deleteGame(id);
            else await deleteProduct(id);
            setOpened(false);
            onDeleted();
        } catch (err) {
            // Otra pestaña puede haber borrado el mismo registro mientras se
            // mostraba la confirmación. La vista debe retirarlo igualmente.
            if (err instanceof ApiError && err.status === 404) {
                setOpened(false);
                onDeleted();
            } else if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                setError('Inicia sesión como staff para eliminar este elemento.');
            } else {
                setError('No se pudo eliminar. Inténtalo de nuevo.');
            }
        } finally {
            deleting.current = false;
            setBusy(false);
        }
    };

    return (
        <>
            {isAdmin && (
                <Button
                    color="red" variant="light" disabled={disabled || busy}
                    leftSection={<IconTrash size={16} />}
                    onClick={() => { setError(null); setOpened(true); }}
                >
                    {label}
                </Button>
            )}
            <Modal
                opened={opened} title={label}
                onClose={() => { if (!deleting.current) setOpened(false); }}
                withCloseButton={!busy} closeOnEscape={!busy} closeOnClickOutside={!busy}
            >
                <Stack>
                    <Text fw={600} style={{ overflowWrap: 'anywhere' }}>{name}</Text>
                    <Text>
                        {kind === 'game'
                            ? 'Se eliminarán el juego, sus productos asociados y sus historiales de precios.'
                            : 'Se eliminarán este producto y su historial de precios.'}
                        {' '}Esta acción no se puede deshacer.
                    </Text>
                    {error && <Alert color="red" role="alert">{error}</Alert>}
                    <Group justify="flex-end">
                        <Button variant="default" disabled={busy} onClick={() => setOpened(false)}>Cancelar</Button>
                        <Button color="red" loading={busy} disabled={busy || disabled || !isAdmin} onClick={confirm}>
                            Eliminar definitivamente
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}

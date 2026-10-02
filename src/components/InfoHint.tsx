'use client';

import { useState, type ReactNode } from 'react';
import { ActionIcon, Popover, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

/** Ícono (i) con una explicación breve, para ponerlo junto al título de un
 *  control en vez de dejar el texto explicativo a la vista.
 *
 *  Popover y no Tooltip: el Tooltip solo abre con hover o foco y en móvil
 *  quedaría inalcanzable (mismo motivo que ShippingInfo). `withinPortal={false}`
 *  mantiene el dropdown DENTRO del Menu/Drawer del navbar: en un portal, el clic
 *  sobre él cuenta como "fuera" y cerraba el menú. */
export default function InfoHint({
    label,
    children,
    position = 'bottom-start',
}: {
    /** Nombre accesible del botón, p. ej. «¿Qué hace el estado físico?». */
    label: string;
    children: ReactNode;
    position?: 'bottom-start' | 'bottom-end';
}) {
    const [opened, setOpened] = useState(false);

    return (
        <Popover
            opened={opened}
            onChange={setOpened}
            withinPortal={false}
            withArrow
            shadow="md"
            width={220}
            position={position}
        >
            <Popover.Target>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    radius="xl"
                    size="sm"
                    aria-label={label}
                    aria-expanded={opened}
                    onClick={() => setOpened((o) => !o)}
                >
                    <IconInfoCircle size={16} />
                </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}>
                <Text fz="xs">{children}</Text>
            </Popover.Dropdown>
        </Popover>
    );
}

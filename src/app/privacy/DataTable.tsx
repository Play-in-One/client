'use client';

import { Table } from '@mantine/core';

/* La tabla vive en un componente cliente porque `Table` de Mantine no se puede
   renderizar desde un Server Component: sus subcomponentes (Table.Thead,
   Table.Tr, ...) llegan como `undefined` al servidor y el render revienta. El
   resto de /privacy sigue siendo servidor, que es lo que interesa para SEO. */

export interface DataRow {
    what: string;
    detail: string;
    why: string;
    basis: string;
    keeps: string;
}

export function DataTable({ rows }: { rows: readonly DataRow[] }) {
    return (
        <Table.ScrollContainer minWidth={600}>
            <Table striped withTableBorder verticalSpacing="sm" fz="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Dato</Table.Th>
                        <Table.Th>Qué incluye</Table.Th>
                        <Table.Th>Para qué</Table.Th>
                        <Table.Th>Base legal</Table.Th>
                        <Table.Th>Cuánto se guarda</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => (
                        <Table.Tr key={row.what}>
                            <Table.Td fw={600}>{row.what}</Table.Td>
                            <Table.Td c="dimmed">{row.detail}</Table.Td>
                            <Table.Td c="dimmed">{row.why}</Table.Td>
                            <Table.Td c="dimmed">{row.basis}</Table.Td>
                            <Table.Td c="dimmed">{row.keeps}</Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
}

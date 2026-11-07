'use client';

import Link from 'next/link';
import { Button } from '@mantine/core';
import { decorative } from '@/lib/colors';
import { IconTag } from '@tabler/icons-react';
import styles from './OffersNavButton.module.css';

/** Uses the home search button styling, sized for the header and drawer. */
export default function OffersNavButton({ active = false, expanded = false, onClick }: {
    active?: boolean;
    expanded?: boolean;
    onClick?: () => void;
}) {
    return (
        <Button component={Link} href="/ofertas" size="sm" radius="xl" color="primaryRed" px={10}
            classNames={{ root: styles.root, section: styles.section }}
            style={{ boxShadow: decorative.primaryButtonShadow }}
            leftSection={<IconTag size={18} stroke={2.25} className={styles.icon} aria-hidden />}
            aria-current={active ? 'page' : undefined}
            data-offers-nav data-expanded={expanded || undefined} onClick={onClick}>
            Ofertas
        </Button>
    );
}

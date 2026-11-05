'use client';

import type { ReactNode } from 'react';
import { Alert } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { useAdmin } from '@/context/AdminContext';
import NotFoundBody from '@/components/NotFoundBody';

/** Staff preview gate. The admin token lives in localStorage, so the server
 *  cannot decide: everyone gets this shell and only a signed-in admin sees the
 *  view. Anyone else sees the 404 body (the page is noindex and nothing links
 *  to it). The data itself is protected by the API, which hides unpublished
 *  models from anonymous requests. */
export function StaffOnly({ placeholder, children }: { placeholder: ReactNode; children: ReactNode }) {
    const { isAdmin, ready } = useAdmin();
    if (!ready) return <>{placeholder}</>;
    if (!isAdmin) return <NotFoundBody />;
    return <>{children}</>;
}

export function StaffPreviewNotice({ children }: { children: ReactNode }) {
    return (
        <Alert color="caution" variant="light" icon={<IconEye size={18} />} title="Vista previa para staff" mb="lg" data-staff-preview>
            {children}
        </Alert>
    );
}

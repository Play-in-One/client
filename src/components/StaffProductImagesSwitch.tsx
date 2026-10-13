'use client';

import { Switch } from '@mantine/core';
import { useAdmin } from '@/context/AdminContext';

export default function StaffProductImagesSwitch() {
    const { isAdmin, showProductImages, setShowProductImages } = useAdmin();
    if (!isAdmin) return null;
    return <Switch label="Mostrar imágenes de productos" checked={showProductImages}
        onChange={event => setShowProductImages(event.currentTarget.checked)} color="primaryRed" />;
}

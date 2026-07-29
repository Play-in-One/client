import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import ContactClient from './ContactClient';

export const metadata: Metadata = buildMetadata({
    title: 'Contacto',
    description: '¿Tienes dudas o sugerencias? Escríbenos y el equipo de Play in One te responderá.',
    path: '/contact',
});

export default function ContactPage() {
    return <ContactClient />;
}

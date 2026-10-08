'use client';

import { useRef, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Alert, Box, Button, Group, Modal, SegmentedControl, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useAdmin } from '@/context/AdminContext';
import { ApiError, createPost, updatePost } from '@/lib/api';
import type { Post, PostPayload } from '@/lib/types';

const CATEGORIES: { value: Post['category']; label: string }[] = [
    { value: 'news', label: 'Noticias' },
    { value: 'update', label: 'Actualización' },
    { value: 'deals', label: 'Ofertas' },
    { value: 'community', label: 'Comunidad' },
    { value: 'gaming', label: 'Gaming' },
];

type FieldErrors = Partial<Record<keyof PostPayload, string>>;
type BodyMode = 'edit' | 'preview';

/* La vista previa usa el MISMO `PostBody` que publica la página, así que lo
   que ve staff es lo que verá el lector. Se carga aparte: este modal se
   importa en las páginas públicas del blog y un import estático metería el
   lector de Markdown en el JS de todos los visitantes. */
const PostBody = dynamic(() => import('@/components/PostBody'));

// Se monta al abrir y se desmonta al cerrar: cancelar descarta la edición.
// La pérdida de sesión no desmonta el modal, para conservar el texto escrito.
export default function PostEditorModal({ post, onClose, onSaved }: {
    post?: Post;
    onClose: () => void;
    onSaved: (post: Post) => void;
}) {
    const { isAdmin } = useAdmin();
    const [draft, setDraft] = useState<PostPayload>(() => ({
        title: post?.title ?? '',
        category: post?.category ?? 'news',
        description: post?.description ?? '',
        image: post?.image ?? '',
    }));
    const [errors, setErrors] = useState<FieldErrors>({});
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [bodyMode, setBodyMode] = useState<BodyMode>('edit');
    const submitting = useRef(false);

    const setField = <K extends keyof PostPayload>(field: K, value: PostPayload[K]) => {
        setDraft((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (submitting.current || !isAdmin) return;

        const invalid: FieldErrors = {};
        if (!draft.title.trim()) invalid.title = 'El título es obligatorio.';
        else if (draft.title.trim().length > 300) invalid.title = 'El título admite hasta 300 caracteres.';
        if (!draft.description.trim()) invalid.description = 'El contenido es obligatorio.';
        const image = draft.image.trim();
        if (image) {
            try {
                const url = new URL(image);
                if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
                if (image.length > 1000) invalid.image = 'La URL admite hasta 1000 caracteres.';
            } catch {
                invalid.image = 'Ingresa una URL de imagen válida (http o https).';
            }
        }
        setErrors(invalid);
        setError(null);
        // El error del contenido se pinta bajo el Textarea: con la vista previa
        // abierta no se vería y el botón parecería no hacer nada.
        if (invalid.description) setBodyMode('edit');
        if (Object.keys(invalid).length) return;

        submitting.current = true;
        setSaving(true);
        try {
            const payload: PostPayload = { ...draft, title: draft.title.trim(), image };
            const saved = post ? await updatePost(post.id, payload) : await createPost(payload);
            onSaved(saved);
        } catch (err) {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                setError('Inicia sesión como staff para guardar. Tu texto sigue en este formulario.');
            } else if (err instanceof ApiError && err.status === 400 && err.data && typeof err.data === 'object') {
                const data = err.data as Record<string, unknown>;
                const fields: FieldErrors = {};
                for (const field of ['title', 'category', 'description', 'image'] as const) {
                    const value = data[field];
                    if (typeof value === 'string') fields[field] = value;
                    else if (Array.isArray(value)) fields[field] = value.filter((item) => typeof item === 'string').join(' ');
                }
                setErrors(fields);
                if (!Object.values(fields).some(Boolean)) setError('No se pudo guardar. Revisa los campos e inténtalo de nuevo.');
            } else {
                setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
            }
        } finally {
            submitting.current = false;
            setSaving(false);
        }
    };

    return (
        <Modal
            opened
            onClose={() => { if (!submitting.current) onClose(); }}
            title={post ? 'Editar post' : 'Crear post'}
            size="lg"
            closeOnClickOutside={!saving}
            closeOnEscape={!saving}
            withCloseButton={!saving}
        >
            <form onSubmit={handleSubmit} noValidate>
                <Stack>
                    <Text size="sm" c="dimmed">Al guardar, el contenido se publica en el blog.</Text>
                    {(error || !isAdmin) && (
                        <Alert color="red" role="alert">
                            {error ?? 'Inicia sesión como staff para guardar. Tu texto sigue en este formulario.'}
                            {!isAdmin && (
                                <Text mt="xs" size="sm">
                                    <Link href="/staff" target="_blank" rel="noopener noreferrer">Iniciar sesión en otra pestaña</Link>
                                </Text>
                            )}
                        </Alert>
                    )}
                    <TextInput
                        label="Título" required maxLength={300} value={draft.title}
                        onChange={(event) => setField('title', event.currentTarget.value)}
                        error={errors.title} disabled={saving}
                    />
                    <Select
                        label="Categoría" required allowDeselect={false} data={CATEGORIES}
                        value={draft.category} error={errors.category} disabled={saving}
                        onChange={(value) => {
                            const category = CATEGORIES.find((item) => item.value === value);
                            if (category) setField('category', category.value);
                        }}
                    />
                    <Stack gap={6}>
                        <SegmentedControl
                            size="xs" value={bodyMode} disabled={saving}
                            aria-label="Editar o previsualizar"
                            onChange={(value) => setBodyMode(value as BodyMode)}
                            data={[
                                { value: 'edit', label: 'Editar' },
                                { value: 'preview', label: 'Vista previa' },
                            ]}
                            style={{ alignSelf: 'flex-start' }}
                        />
                        {/* Se desmonta en la vista previa, pero el texto vive en
                            `draft`: volver a «Editar» lo recupera intacto. */}
                        {bodyMode === 'edit' ? (
                            <Textarea
                                label="Contenido" required rows={8} value={draft.description}
                                description="Admite Markdown: ## subtítulos, **negrita**, - listas y [enlaces](/juego/...)"
                                onChange={(event) => setField('description', event.currentTarget.value)}
                                error={errors.description} disabled={saving}
                            />
                        ) : (
                            <Box
                                className="content-card" p="md" role="region" aria-label="Vista previa del contenido"
                                style={{ maxHeight: '50vh', overflowY: 'auto' }}
                            >
                                {draft.description.trim()
                                    ? <PostBody markdown={draft.description} />
                                    : <Text c="dimmed" size="sm">Todavía no hay contenido que previsualizar.</Text>}
                            </Box>
                        )}
                    </Stack>
                    <TextInput
                        label="URL de imagen" description="Opcional. Usa una URL http o https."
                        value={draft.image} maxLength={1000}
                        onChange={(event) => setField('image', event.currentTarget.value)}
                        error={errors.image} disabled={saving}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={onClose} disabled={saving}>Cancelar</Button>
                        <Button type="submit" loading={saving} disabled={saving || !isAdmin}>
                            {post ? 'Guardar cambios' : 'Publicar post'}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}

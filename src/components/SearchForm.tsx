'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Group, TextInput, type GroupProps, type TextInputProps } from '@mantine/core';

/** Draft text belongs to the input, never to the catalogue or the root context.
 * Only an explicit submit changes results. External navigation replaces the draft. */
export default function SearchForm({
    query = '', onSearch, inputProps, groupProps, style, children,
}: {
    query?: string;
    onSearch: (query: string) => void;
    inputProps?: Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange'>;
    groupProps?: GroupProps;
    style?: CSSProperties;
    children?: ReactNode;
}) {
    const input = useRef<HTMLInputElement>(null);
    const appliedQuery = useRef(query);
    useEffect(() => {
        // Preserve native typing that happened before hydration. Only a real
        // external navigation replaces the draft; mounting does not clear it.
        if (appliedQuery.current !== query && input.current) input.current.value = query;
        appliedQuery.current = query;
    }, [query]);
    return (
        <form action="/search" method="get" style={style} role="search" onSubmit={(event) => {
            event.preventDefault();
            onSearch(input.current?.value.trim() ?? '');
        }}>
            <Group gap={0} {...groupProps}>
                <TextInput name="q" aria-label={inputProps?.placeholder ?? 'Buscar juegos'} {...inputProps}
                    ref={input} defaultValue={query}
                    onKeyDown={(event) => {
                        // Enter while composing a character must not submit the form.
                        if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
                        inputProps?.onKeyDown?.(event);
                    }} />
                {children}
            </Group>
        </form>
    );
}

import type { JsonLdObject } from '@/lib/seo';

/**
 * Emits one or more schema.org JSON-LD <script> tags. Server-safe (no client
 * hooks) so it can be rendered directly from Server Components. `<` is escaped
 * to prevent the JSON string from breaking out of the <script> element.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
    const blocks = Array.isArray(data) ? data : [data];
    return (
        <>
            {blocks.map((block, i) => (
                <script
                    key={i}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(block).replace(/</g, '\\u003c'),
                    }}
                />
            ))}
        </>
    );
}

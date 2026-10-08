import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { SEEDED, seededPostId, serverHtml } from './helpers';
import { POLICY_VERSION } from '../../src/lib/consent';
import { CATEGORY_LABEL } from '../../src/lib/postText';
import type { Post } from '../../src/lib/types';

/**
 * El blog se resuelve ENTERO en el servidor (`app/blog/page.tsx` y
 * `app/blog/[slug]/page.tsx`), y `BlogListClient`/`BlogPostClient` se limitan a
 * pintar el prop que reciben. Ese fetch sale del contenedor de Next hacia
 * `backend:8001`, así que `page.route` no puede verlo: los mocks que había aquí
 * no interceptaban nada y los tests dependían, sin decirlo, de que la base
 * tuviera unos posts concretos.
 *
 * Ahora se apoyan en `manage.py seed_e2e`, como el resto de specs que ya
 * funcionaban sin mocks.
 */

const [DEALS_POST, NEWS_POST] = SEEDED.posts;
/** Post Markdown de `seed_e2e` (contrato del backend B1). */
const GUIDE_TITLE = 'E2E Guía con formato';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://pio.localhost:8080/api';

/** El post sembrado tal como lo publica la API, con su `slug`. */
async function seededPost(request: APIRequestContext, title: string): Promise<Post> {
    const res = await request.get(`${API}/posts/?search=${encodeURIComponent(title)}`);
    const { results } = await res.json();
    const post = (results as Post[]).find((p) => p.title === title);
    if (!post?.slug) {
        throw new Error(
            `No está el post "${title}" con slug. Corre: docker exec develop-backend-1 python manage.py seed_e2e`,
        );
    }
    return post;
}

/** Bloques JSON-LD del HTML CRUDO (`serverHtml` quita los <script>). */
async function jsonLdBlocks(request: APIRequestContext, path: string): Promise<Record<string, unknown>[]> {
    const html = await (await request.get(path, { headers: { 'User-Agent': 'GPTBot' } })).text();
    return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((m) => JSON.parse(m[1]));
}

test('la página de blog carga los posts', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByText(DEALS_POST.title)).toBeVisible();
    await expect(page.getByText(NEWS_POST.title)).toBeVisible();
});

test('los badges de categoría se muestran en cada post', async ({ page }) => {
    await page.goto('/blog');
    // El badge repite la categoría en cada tarjeta de esa categoría, así que se
    // comprueba que aparezca al menos una vez y no que sea único.
    await expect(page.getByText(CATEGORY_LABEL[DEALS_POST.category]).first()).toBeVisible();
    await expect(page.getByText(CATEGORY_LABEL[NEWS_POST.category]).first()).toBeVisible();
});

test('hacer click en un post navega al detalle', async ({ page }) => {
    const id = await seededPostId(page, DEALS_POST.title);
    await page.goto('/blog');
    await page.getByText(DEALS_POST.title).click();
    await expect(page).toHaveURL(new RegExp(`/blog/[a-z0-9-]+-${id}$`));
});

test('la página de detalle de post muestra el contenido', async ({ page }) => {
    const id = await seededPostId(page, DEALS_POST.title);
    await page.goto(`/blog/${id}`);
    await expect(page.getByRole('heading', { name: DEALS_POST.title })).toBeVisible();
    await expect(
        page.getByText('Aprovecha estas ofertas de videojuegos este mes en Chile.'),
    ).toBeVisible();
});

test('la página de detalle muestra el badge de categoría', async ({ page }) => {
    const id = await seededPostId(page, DEALS_POST.title);
    await page.goto(`/blog/${id}`);
    await expect(page.getByText(CATEGORY_LABEL[DEALS_POST.category]).first()).toBeVisible();
});

/* ── URL canónica con slug: status reales, no un 200 con meta refresh ──── */

test('/blog/<id> responde 308 a /blog/<slug>-<id>', async ({ request }) => {
    const post = await seededPost(request, DEALS_POST.title);
    const res = await request.get(`/blog/${post.id}`, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toMatch(new RegExp(`/blog/${post.slug}-${post.id}$`));
});

test('un slug equivocado responde 308 a la canónica', async ({ request }) => {
    const post = await seededPost(request, DEALS_POST.title);
    const res = await request.get(`/blog/otro-titulo-${post.id}`, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toMatch(new RegExp(`/blog/${post.slug}-${post.id}$`));
});

test('un post inexistente o un segmento sin id es un 404 de verdad', async ({ request }) => {
    expect((await request.get('/blog/nada-99999999', { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get('/blog/sin-id', { maxRedirects: 0 })).status()).toBe(404);
});

test('el HTML del servidor trae cuerpo, canonical, título, categoría y JSON-LD', async ({ request }) => {
    const post = await seededPost(request, DEALS_POST.title);
    const path = `/blog/${post.slug}-${post.id}`;
    const html = await serverHtml(request, path);
    expect(html).toContain('Aprovecha estas ofertas de videojuegos este mes en Chile.');
    expect(html).toMatch(new RegExp(`<link rel="canonical" href="[^"]*${path}"`));
    expect(html).toContain(`<title>${DEALS_POST.title} | Blog de Play in One</title>`);
    expect(html).toMatch(new RegExp(`>${CATEGORY_LABEL[DEALS_POST.category]}<`));

    const article = (await jsonLdBlocks(request, path))
        .find((b) => b['@type'] === 'BlogPosting' || b['@type'] === 'NewsArticle');
    expect(article).toBeTruthy();
    expect(article!.dateModified).toBeTruthy();
    expect(article!.articleSection).toBe(CATEGORY_LABEL[DEALS_POST.category]);
    expect(article!.mainEntityOfPage).toMatch(new RegExp(`${path}$`));
});

test('el description del JSON-LD es un resumen en texto plano, no el cuerpo', async ({ request }) => {
    const post = await seededPost(request, GUIDE_TITLE);
    const article = (await jsonLdBlocks(request, `/blog/${post.slug}-${post.id}`))
        .find((b) => b['@type'] === 'BlogPosting' || b['@type'] === 'NewsArticle');
    expect(article).toBeTruthy();
    const description = String(article!.description);
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThan(post.description.length);
    expect(description).not.toMatch(/[#*[\]]/);
    expect(article!.wordCount).toBeGreaterThan(0);
});

/* ── Cuerpo Markdown y posts relacionados, en el HTML del servidor ───── */

test('el cuerpo Markdown sale renderizado en el HTML del servidor', async ({ request }) => {
    const post = await seededPost(request, GUIDE_TITLE);
    const html = await serverHtml(request, `/blog/${post.slug}-${post.id}`);
    expect(html).toMatch(/<h2[^>]*>Qué incluye<\/h2>/);
    expect(html).toMatch(/<ul[^>]*>\s*<li>Comparación de precios<\/li>\s*<li>Historial de ofertas<\/li>\s*<\/ul>/);
    expect(html).toMatch(/<a [^>]*href="\/juego\/e2e-juego-de-prueba-999001"[^>]*>ficha del juego<\/a>/);
    expect(html).toMatch(/<strong>formato<\/strong>/);
    // Ni la sintaxis cruda ni un segundo <h1>: el único es el título del post.
    expect(html).not.toContain('## Qué incluye');
    expect(html).not.toContain('**formato**');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
});

test('un post en texto plano se sigue leyendo igual', async ({ request }) => {
    const post = await seededPost(request, DEALS_POST.title);
    const html = await serverHtml(request, `/blog/${post.slug}-${post.id}`);
    expect(html).toMatch(/<p[^>]*>Aprovecha estas ofertas de videojuegos este mes en Chile\.<\/p>/);
    expect(html).not.toContain('\\n');
});

test('el post enlaza «Más del blog» hacia otros posts, en el HTML del servidor', async ({ request }) => {
    const post = await seededPost(request, GUIDE_TITLE);
    const path = `/blog/${post.slug}-${post.id}`;
    const html = await serverHtml(request, path);
    const section = html.match(/<section[^>]*aria-labelledby="posts-relacionados"[\s\S]*?<\/section>/)?.[0];
    expect(section).toBeTruthy();
    expect(section).toContain('Más del blog');
    expect(section).toContain('href="/blog"');
    const links = [...section!.matchAll(/href="(\/blog\/[^"]+)"/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links.length).toBeLessThanOrEqual(3);
    expect(links).not.toContain(path);
    expect(new Set(links).size).toBe(links.length);
});

test('/blog enlaza los posts por su URL con slug y declara el Blog', async ({ request }) => {
    const post = await seededPost(request, DEALS_POST.title);
    const html = await serverHtml(request, '/blog');
    expect(html).toContain(`href="/blog/${post.slug}-${post.id}"`);
    expect(html).not.toMatch(/href="\/blog\/\d+"/);

    const blog = (await jsonLdBlocks(request, '/blog')).find((b) => b['@type'] === 'Blog');
    expect(blog).toBeTruthy();
    const urls = (blog!.blogPost as { url: string }[]).map((p) => p.url);
    expect(urls.some((u) => u.endsWith(`/blog/${post.slug}-${post.id}`))).toBe(true);
});

async function signInAsStaff(page: Page) {
    await page.context().addCookies([{
        name: 'pio_consent',
        value: encodeURIComponent(JSON.stringify({
            v: POLICY_VERSION, analytics: false, measure: false, ads: false,
            ts: new Date().toISOString(),
        })),
        url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    }]);
    await page.addInitScript(() => {
        localStorage.setItem('pio_admin_token', 'blog-test-token');
        localStorage.setItem('pio_admin_user', 'blog-staff');
    });
}

test('los visitantes no pueden abrir los controles de edición', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('button', { name: 'Crear post' })).toHaveCount(0);
    const id = await seededPostId(page, DEALS_POST.title);
    await page.goto(`/blog/${id}`);
    await expect(page.getByRole('button', { name: 'Editar post' })).toHaveCount(0);
});

test('staff crea un post y lo ve inmediatamente en el listado', async ({ page }) => {
    await signInAsStaff(page);
    const payload = {
        title: 'Un nuevo post de la comunidad', category: 'community',
        description: 'Primer párrafo.\nSegundo párrafo.', image: '',
    };
    await page.route('**/api/posts/', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        expect(route.request().headers().authorization).toBe('Token blog-test-token');
        expect(route.request().postDataJSON()).toEqual(payload);
        await route.fulfill({ status: 201, json: {
            id: 999999, ...payload, published_date: '2026-10-07T12:00:00Z',
        } });
    });
    await page.goto('/blog');
    await page.getByRole('button', { name: 'Crear post' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear post' });
    await dialog.getByRole('textbox', { name: 'Título', exact: true }).fill(payload.title);
    await dialog.getByLabel('Categoría').click();
    await page.getByRole('option', { name: 'Comunidad', exact: true }).click();
    await dialog.getByLabel('Contenido').fill(payload.description);
    await dialog.getByRole('button', { name: 'Publicar post' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('link', { name: /Un nuevo post de la comunidad/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver post', exact: true })).toHaveAttribute('href', '/blog/999999');
});

test('staff edita el artículo con los campos precargados', async ({ page }) => {
    await signInAsStaff(page);
    const id = await seededPostId(page, DEALS_POST.title);
    const original = await (await page.request.get(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://pio.localhost:8080/api'}/posts/${id}/`,
    )).json();
    await page.route(`**/api/posts/${id}/`, async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        expect(route.request().headers().authorization).toBe('Token blog-test-token');
        expect(route.request().postDataJSON()).toEqual({
            title: 'Título actualizado por staff', category: original.category,
            description: 'Texto actualizado.\nOtra línea.\n\n## Subtítulo editado', image: '',
        });
        await route.fulfill({ json: {
            ...original, ...route.request().postDataJSON(),
        } });
    });
    await page.goto(`/blog/${id}`);
    const date = await page.locator('time').first().getAttribute('datetime');
    await page.getByRole('button', { name: 'Editar post' }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar post' });
    await expect(dialog.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue(DEALS_POST.title);
    await expect(dialog.getByLabel('Contenido')).toHaveValue(original.description);
    await expect(dialog.getByLabel('Categoría')).toHaveValue('Ofertas');
    await dialog.getByRole('textbox', { name: 'Título', exact: true }).fill('Título actualizado por staff');
    await dialog.getByLabel('Contenido').fill('Texto actualizado.\nOtra línea.\n\n## Subtítulo editado');
    await dialog.getByLabel('URL de imagen').fill('');
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Título actualizado por staff' })).toBeVisible();
    // El cuerpo editado se pinta con el mismo PostBody que el servidor: el
    // salto simple es un <br> dentro del párrafo y el `##` un subtítulo.
    const edited = page.getByRole('paragraph').filter({ hasText: 'Texto actualizado.' });
    await expect(edited).toContainText('Otra línea.');
    await expect(edited.locator('br')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2, name: 'Subtítulo editado' })).toBeVisible();
    await expect(page.getByText('Aprovecha estas ofertas de videojuegos este mes en Chile.')).toHaveCount(0);
    await expect(page.locator('time').first()).toHaveAttribute('datetime', date!);
    await page.getByRole('button', { name: 'Editar post' }).click();
    await expect(dialog.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue('Título actualizado por staff');
});

test('staff previsualiza el Markdown sin perder lo escrito', async ({ page }) => {
    await signInAsStaff(page);
    await page.goto('/blog');
    await page.getByRole('button', { name: 'Crear post' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear post' });
    const body = '## Subtítulo de prueba\n\n- Un punto\n\nTexto <em>crudo</em> y [ficha](/juego/e2e-juego-de-prueba-999001).';
    await expect(dialog.getByLabel('Contenido')).toHaveAccessibleDescription(/Admite Markdown/);
    await dialog.getByLabel('Contenido').fill(body);
    await dialog.getByText('Vista previa', { exact: true }).click();
    const preview = dialog.getByRole('region', { name: 'Vista previa del contenido' });
    await expect(preview.getByRole('heading', { level: 2, name: 'Subtítulo de prueba' })).toBeVisible();
    await expect(preview.getByRole('listitem')).toHaveText('Un punto');
    await expect(preview.getByRole('link', { name: 'ficha' })).toHaveAttribute('href', '/juego/e2e-juego-de-prueba-999001');
    // El HTML crudo no se interpreta ni se muestra.
    await expect(preview.locator('em')).toHaveCount(0);
    await expect(preview).not.toContainText('<em>');
    await dialog.getByText('Editar', { exact: true }).click();
    await expect(dialog.getByLabel('Contenido')).toHaveValue(body);
});

test('cancelar descarta los campos sin publicar', async ({ page }) => {
    await signInAsStaff(page);
    await page.goto('/blog');
    await page.getByRole('button', { name: 'Crear post' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear post' });
    await dialog.getByRole('textbox', { name: 'Título', exact: true }).fill('No se debe publicar');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('No se debe publicar')).toHaveCount(0);
    await page.getByRole('button', { name: 'Crear post' }).click();
    await expect(dialog.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue('');
});

test('el formulario valida campos y conserva el texto ante errores del servidor', async ({ page }) => {
    await signInAsStaff(page);
    let writes = 0;
    await page.route('**/api/posts/', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        writes++;
        await route.fulfill(writes === 1
            ? { status: 400, json: { image: ['La URL de imagen fue rechazada.'] } }
            : { status: 500, json: { detail: 'Internal Server Error' } });
    });
    await page.goto('/blog');
    await page.getByRole('button', { name: 'Crear post' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear post' });
    await dialog.getByRole('textbox', { name: 'Título', exact: true }).fill('   ');
    await dialog.getByLabel('Contenido').fill('   ');
    await dialog.getByRole('button', { name: 'Publicar post' }).click();
    await expect(dialog.getByText('El título es obligatorio.')).toBeVisible();
    await expect(dialog.getByText('El contenido es obligatorio.')).toBeVisible();
    expect(writes).toBe(0);
    await dialog.getByRole('textbox', { name: 'Título', exact: true }).fill('Texto que debe conservarse');
    await dialog.getByLabel('Contenido').fill('Contenido que debe conservarse');
    await dialog.getByLabel('URL de imagen').fill('not-a-url');
    await dialog.getByRole('button', { name: 'Publicar post' }).click();
    await expect(dialog.getByText('Ingresa una URL de imagen válida (http o https).')).toBeVisible();
    expect(writes).toBe(0);
    await dialog.getByLabel('URL de imagen').fill('https://example.com/image.jpg');
    await dialog.getByRole('button', { name: 'Publicar post' }).click();
    await expect(dialog.getByText('La URL de imagen fue rechazada.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Publicar post' }).click();
    await expect(dialog.getByRole('alert')).toContainText('No se pudo guardar');
    await expect(dialog.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue('Texto que debe conservarse');
    await expect(dialog.getByLabel('Contenido')).toHaveValue('Contenido que debe conservarse');
});

test('una sesión vencida conserva el formulario y requiere iniciar sesión', async ({ page }) => {
    await signInAsStaff(page);
    await page.route('**/api/posts/', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        await route.fulfill({ status: 403, json: { detail: 'Invalid token.' } });
    });
    await page.goto('/blog');
    await page.getByRole('button', { name: 'Crear post' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear post' });
    await dialog.getByRole('textbox', { name: 'Título', exact: true }).fill('Texto sin perder');
    await dialog.getByLabel('Contenido').fill('Contenido sin perder');
    await dialog.getByRole('button', { name: 'Publicar post' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Inicia sesión');
    await expect(dialog.getByLabel('Contenido')).toHaveValue('Contenido sin perder');
    await expect(dialog.getByRole('button', { name: 'Publicar post' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Crear post', exact: true })).toHaveCount(0);
});

test('el formulario cabe en móvil y evita envíos repetidos', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await signInAsStaff(page);
    let writes = 0;
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    await page.route('**/api/posts/', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        writes++;
        await pending;
        await route.fulfill({ status: 201, json: {
            id: 999998, ...route.request().postDataJSON(), published_date: '2026-10-07T12:00:00Z',
        } });
    });
    await page.goto('/blog');
    await page.getByRole('button', { name: 'Crear post' }).click();
    const dialog = page.getByRole('dialog', { name: 'Crear post' });
    await dialog.getByRole('textbox', { name: 'Título', exact: true }).fill('Post desde móvil');
    await dialog.getByLabel('Contenido').fill('Contenido desde móvil');
    const save = dialog.getByRole('button', { name: 'Publicar post' });
    await save.scrollIntoViewIfNeeded();
    const bounds = await save.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
    await save.click();
    try {
        await expect(save).toBeDisabled();
        await expect.poll(() => writes).toBe(1);
        await dialog.getByLabel('Contenido').press('Control+Enter');
        expect(writes).toBe(1);
    } finally {
        finish();
    }
    await expect(dialog).toBeHidden();
});

test('la pantalla staff enlaza al blog', async ({ page }) => {
    await signInAsStaff(page);
    await page.goto('/staff');
    await expect(page.getByRole('link', { name: 'Ir al blog' })).toHaveAttribute('href', '/blog');
});

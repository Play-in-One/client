import { test, expect } from '@playwright/test';
import { SEEDED, seededPostId } from './helpers';

/**
 * El blog se resuelve ENTERO en el servidor (`app/blog/page.tsx` y
 * `app/blog/[id]/page.tsx`), y `BlogListClient`/`BlogPostClient` se limitan a
 * pintar el prop que reciben. Ese fetch sale del contenedor de Next hacia
 * `backend:8001`, así que `page.route` no puede verlo: los mocks que había aquí
 * no interceptaban nada y los tests dependían, sin decirlo, de que la base
 * tuviera unos posts concretos.
 *
 * Ahora se apoyan en `manage.py seed_e2e`, como el resto de specs que ya
 * funcionaban sin mocks.
 */

const [DEALS_POST, NEWS_POST] = SEEDED.posts;

test('la página de blog carga los posts', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByText(DEALS_POST.title)).toBeVisible();
    await expect(page.getByText(NEWS_POST.title)).toBeVisible();
});

test('los badges de categoría se muestran en cada post', async ({ page }) => {
    await page.goto('/blog');
    // El badge repite la categoría en cada tarjeta de esa categoría, así que se
    // comprueba que aparezca al menos una vez y no que sea único.
    await expect(page.getByText(DEALS_POST.category).first()).toBeVisible();
    await expect(page.getByText(NEWS_POST.category).first()).toBeVisible();
});

test('hacer click en un post navega al detalle', async ({ page }) => {
    const id = await seededPostId(page, DEALS_POST.title);
    await page.goto('/blog');
    await page.getByText(DEALS_POST.title).click();
    await expect(page).toHaveURL(new RegExp(`/blog/${id}`));
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
    await expect(page.getByText(DEALS_POST.category).first()).toBeVisible();
});

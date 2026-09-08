import { test, expect } from '@playwright/test';

const emptyPaginated = { count: 0, next: null, previous: null, results: [] };

test.beforeEach(async ({ page }) => {
    // Silence all API calls so pages don't hang
    await page.route(/\/api\//, (route) =>
        route.fulfill({ json: emptyPaginated })
    );
});

test('el link del logo navega a la página de inicio', async ({ page }) => {
    await page.goto('/search');
    // Click the logo/brand link in the Navbar
    await page.getByRole('navigation').getByRole('link').first().click();
    await expect(page).toHaveURL('/');
});

test('PlayStation 5 en el menú del Navbar navega a su landing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'PlayStation', exact: true }).hover();
    await page.getByRole('menuitem', { name: 'PlayStation 5', exact: true }).click();
    await expect(page).toHaveURL(/\/juegos\/ps5$/);
});

test('Switch en el menú del Navbar navega a su landing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'Nintendo', exact: true }).hover();
    // El menú usa el nombre LARGO: una consola tiene dos nombres, y el corto
    // ("NS") es para insignias y selectores estrechos, no para leerlo aquí.
    // `exact` importa — sin él, "Nintendo Switch" también casa con "Nintendo Switch 2".
    await page.getByRole('menuitem', { name: 'Nintendo Switch', exact: true }).click();
    await expect(page).toHaveURL(/\/juegos\/switch$/);
});

test('Xbox Series en el menú del Navbar navega a su landing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'Xbox', exact: true }).hover();
    await page.getByRole('menuitem', { name: 'Xbox Series', exact: true }).click();
    await expect(page).toHaveURL(/\/juegos\/xboxseries$/);
});

test('el menú mobile se abre en viewport 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // El único botón de la barra en móvil es el burger. El selector anterior
    // combinaba tres alternativas con `.or()` y casaba dos elementos a la vez,
    // así que moría por strict mode antes de comprobar nada.
    const burger = page.getByRole('navigation').getByRole('button').last();
    await expect(burger).toBeVisible();
    await burger.click();
    // El drawer se abre: dentro está el CTA "Mis Guardados". Antes se buscaba
    // "Ver Ofertas", un rótulo que ya no existe en ninguna parte del código.
    await expect(page.getByRole('link', { name: 'Mis Guardados' })).toBeVisible({ timeout: 3000 });
});

test('el Navbar tiene un toggle de color scheme', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');
    // The ActionIcon for dark/light toggle is a button in the nav
    const toggleBtns = nav.getByRole('button');
    await expect(toggleBtns.first()).toBeVisible();
});

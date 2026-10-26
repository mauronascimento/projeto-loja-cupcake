import { expect, test } from 'playwright/test';
import type { Page } from 'playwright';

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const expectedAnonymousSessionLookup =
      message.location().url.endsWith('/api/v1/auth/me') &&
      message.text().includes('401 (Unauthorized)');
    if (message.type() === 'error' && !expectedAnonymousSessionLookup) {
      errors.push(message.text());
    }
  });
  return errors;
}

test('catálogo e navegação permanecem utilizáveis nos viewports definidos', async ({ page }, testInfo) => {
  const browserErrors = collectBrowserErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Nossos sabores' })).toBeVisible();
  await expect(page.locator('.product-card').first()).toBeVisible();

  const viewports = [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    )).toBe(true);
    for (const card of await page.locator('.product-card').all()) {
      await card.scrollIntoViewIfNeeded();
      const imageUrl = await card.locator('.product-image').evaluate((element) =>
        getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] ?? null,
      );
      if (!imageUrl) {
        throw new Error('O card do produto não contém uma imagem de fundo.');
      }
      const imageResponse = await page.request.get(new URL(imageUrl, page.url()).toString());
      expect(imageResponse.status()).toBe(200);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`catalog-${viewport.width}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const menuButton = page.getByRole('button', { name: 'Abrir menu' });
  await menuButton.click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Minha conta' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Cardápio' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar menu' }).click();
  await expect(page.getByRole('link', { name: 'Cardápio' })).toBeHidden();
  expect(browserErrors).toEqual([]);
});

test('cliente cria, acompanha e cancela um pedido demonstrativo', async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.goto('/');
  const addButton = page.getByRole('button', { name: 'Adicionar', exact: true }).first();
  await expect(addButton).toBeEnabled();
  await addButton.click();
  await page.goto('/cart');

  const checkoutLink = page.getByRole('link', { name: 'Continuar para pagamento' });
  await expect(checkoutLink).toHaveAttribute('aria-disabled', 'false');
  await checkoutLink.click();
  await page.getByRole('link', { name: 'Criar conta' }).click();

  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  await page.getByLabel('Nome completo').fill('Cliente de Teste');
  await page.getByLabel('E-mail').fill(`e2e-${uniqueSuffix}@example.com`);
  await page.getByLabel('Telefone').fill('11987654321');
  await page.getByLabel(/Senha/).first().fill('CupcakeE2E!2026');
  await page.getByLabel('Confirmar senha').fill('CupcakeE2E!2026');
  await page.getByLabel('CEP').fill('01310100');
  await page.getByLabel('Estado (UF)').fill('SP');
  await page.getByLabel('Logradouro').fill('Avenida Paulista');
  await page.getByLabel('Número').fill('1000');
  await page.getByLabel('Complemento').fill('Sala de testes');
  await page.getByLabel('Bairro').fill('Bela Vista');
  await page.getByLabel('Cidade').fill('São Paulo');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByRole('link', { name: 'Alterar endereço' }).click();
  await expect(page).toHaveURL(/\/account\?returnTo=(?:%2F|\/)checkout$/i);
  await page.getByLabel('Número').fill('1001');
  await page.getByRole('button', { name: 'Salvar endereço' }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByLabel('Forma de pagamento').selectOption('PIX');
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();
  await expect(page).toHaveURL(/\/orders\/\d+\?created=1$/);
  await expect(page.getByText(/Pedido realizado/)).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancelar pedido' }).click();
  await expect(page.getByText('Status: Cancelado')).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('administrador acessa gestão, estoque, pedidos e relatórios', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, 'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para executar este fluxo.');

  const browserErrors = collectBrowserErrors(page);
  await page.goto('/login?next=/admin');
  await page.getByLabel('E-mail').fill(email!);
  await page.getByLabel('Senha').fill(password!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL((url) => new URL(url).pathname === '/admin');
  await expect(page.getByRole('heading', { name: 'Painel administrativo' })).toBeVisible();

  for (const route of [
    { path: '/admin/products', heading: 'Produtos' },
    { path: '/admin/stock', heading: 'Estoque' },
    { path: '/admin/orders', heading: 'Pedidos' },
    { path: '/admin/reports', heading: 'Relatórios' },
  ]) {
    await page.goto(route.path);
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    await expect.poll(() => page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    )).toBe(true);
  }
  expect(browserErrors).toEqual([]);
});

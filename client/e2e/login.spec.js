import { test, expect } from '@playwright/test';

test('un administrador puede iniciar sesión', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByText('Sistema de Gestión de Inventario')).toBeVisible();

  await page.getByLabel(/Correo institucional/i).fill('admin@sena.edu.co');
  await page.getByLabel(/Contraseña/i).fill('AdminSENA2024');
  await page.getByRole('button', { name: /Iniciar sesión/i }).click();

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByText('Dashboard Administrador')).toBeVisible();
});

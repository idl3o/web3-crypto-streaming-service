import { test, expect } from '@playwright/test';

test.describe('Civilization Feature', () => {
    test('shows civilization progress in transaction view', async ({ page }) => {
        // Navigate to transactions page
        await page.goto('/transactions');

        // Wait for civilization components to load
        await page.waitForSelector('.civilization-milestones');

        // Check that milestones are displayed
        const milestones = await page.locator('.milestone-item').count();
        expect(milestones).toBeGreaterThan(0);

        // Check that civilization name is displayed
        const civilizationName = await page.locator('.civ-name').textContent();
        expect(civilizationName).toBeTruthy();

        // Check that resources are displayed
        const resources = await page.locator('.resource-item').count();
        expect(resources).toBeGreaterThan(0);
    });

    test('can build a structure with sufficient resources', async ({ page }) => {
        // Set up localStorage to simulate having resources
        await page.addInitScript(() => {
            localStorage.setItem('civ_gold', '1000');
            localStorage.setItem('civ_production', '800');
            localStorage.setItem('civ_points', '250'); // Level 3
        });

        // Navigate to transactions page
        await page.goto('/transactions');

        // Expand civilization details
        await page.locator('.civ-toggle-btn').click();

        // Wait for buildings to be displayed
        await page.waitForSelector('.building-item.can-build');

        // Click on a building that can be built
        await page.locator('.building-item.can-build').first().click();

        // Check for toast notification success
        await expect(page.locator('.toast-message')).toBeVisible();
        await expect(page.locator('.toast-message')).toContainText('built');

        // Verify building now shows in constructed buildings
        await expect(page.locator('.building-item.built')).toBeVisible();
    });

    test('rename civilization', async ({ page }) => {
        await page.goto('/transactions');
        await page.waitForSelector('.civ-name');

        // Click edit button
        await page.locator('.edit-name-btn').click();

        // Type new name
        await page.locator('.name-input').fill('New Empire');

        // Save name
        await page.locator('.save-name-btn').click();

        // Verify name was updated
        await expect(page.locator('.civ-name')).toContainText('New Empire');
    });
});

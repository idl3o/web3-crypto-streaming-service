import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCivilizationStore } from '@/stores/civilizationStore';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock transaction store
vi.mock('@/stores/transactionStore', () => ({
    useTransactionStore: () => ({
        transactions: [],
        newTransactionAlert: null,
    }),
}));

// Mock engagement store
vi.mock('@/stores/engagementStore', () => ({
    useEngagementStore: () => ({
        totalReactions: 0,
    }),
}));

describe('Civilization Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorageMock.clear();
    });

    it('initializes with default values', () => {
        const store = useCivilizationStore();

        expect(store.name).toBe('My Civilization');
        expect(store.points).toBe(0);
        expect(store.resources.gold).toBe(0);
        expect(store.level.level).toBe(1);
        expect(store.feeDiscount).toBe(0.01); // Basic discount at level 1
    });

    it('can rename civilization', () => {
        const store = useCivilizationStore();
        store.renameCivilization('Atlantis');

        expect(store.name).toBe('Atlantis');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('civ_name', 'Atlantis');
    });

    it('calculates next level correctly', () => {
        const store = useCivilizationStore();
        store.points = 120; // Level 2

        expect(store.level.level).toBe(2);
        expect(store.nextLevel?.level).toBe(3);
        expect(store.nextLevel?.requiredPoints).toBe(250);
    });

    it('calculates progress to next level correctly', () => {
        const store = useCivilizationStore();
        store.points = 150; // Level 2 (100 points) with 50 points toward Level 3 (250 points)

        // Progress should be 50/150 = 33.33%
        expect(store.progressToNextLevel).toBe(33);
    });

    it('can construct a building when resources are sufficient', () => {
        const store = useCivilizationStore();

        // Set level to 2 to unlock Marketplace
        store.points = 120;

        // Add resources
        store.resources.gold = 600;
        store.resources.production = 400;

        // Build marketplace
        const result = store.constructBuilding('marketplace');

        expect(result).toBe(true);
        expect(store.resources.gold).toBe(100); // 600 - 500
        expect(store.resources.production).toBe(100); // 400 - 300
        expect(store.buildings).toContain('marketplace');
    });

    it('cannot construct a building when resources are insufficient', () => {
        const store = useCivilizationStore();

        // Set level to 2 to unlock Marketplace
        store.points = 120;

        // Add insufficient resources
        store.resources.gold = 300;
        store.resources.production = 200;

        // Try to build marketplace
        const result = store.constructBuilding('marketplace');

        expect(result).toBe(false);
        expect(store.resources.gold).toBe(300); // Unchanged
        expect(store.resources.production).toBe(200); // Unchanged
        expect(store.buildings).not.toContain('marketplace');
    });

    it('increases fee discount with buildings', () => {
        const store = useCivilizationStore();

        // Initial discount at level 1 should be 1%
        expect(store.feeDiscount).toBe(0.01);

        // Simulate having a bank
        store.buildings = ['bank'];

        // Discount should now be 3% (1% base + 2% from bank)
        expect(store.feeDiscount).toBe(0.03);
    });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionService } from '@/services/transactionService';
import { useCivilizationStore } from '@/stores/civilizationStore';

// Mock the ethers provider
const mockProvider = {
    getSigner: vi.fn(() => ({
        getAddress: vi.fn(() => Promise.resolve('0x123456789')),
        sendTransaction: vi.fn(() => Promise.resolve({ hash: '0xabcdef' }))
    }))
};

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
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock civilization store
vi.mock('@/stores/civilizationStore', () => ({
    useCivilizationStore: vi.fn(() => ({
        feeDiscount: 0.05
    }))
}));

describe('TransactionService with Civilization Discount', () => {
    let transactionService: TransactionService;

    beforeEach(() => {
        localStorageMock.clear();
        transactionService = new TransactionService(mockProvider as any);
    });

    it('applies civilization discount when recording stream payment', async () => {
        const mockStream = {
            id: 'stream123',
            title: 'Test Stream',
            timeWatched: 10,
            paymentRate: 0.01,
            streamingActive: false,
            amountSpent: 0.1
        };

        // Record a payment with a 10% Fae discount
        const transaction = await transactionService.recordStreamPayment(
            '0x123456789',
            mockStream,
            0.1, // final amount
            0.1  // Fae discount
        );

        // Check that both discounts are applied (0.1 Fae + 0.05 Civilization = 0.15)
        // Original amount should be: 0.1 / (1 - 0.15) ≈ 0.1176
        expect(transaction.originalAmount).toBeCloseTo(0.1176, 4);
        expect(transaction.discountApplied).toBe(0.15);
        expect(transaction.amount).toBe(0.1);
    });

    it('caps total discount at 15%', async () => {
        const mockStore = useCivilizationStore as any;
        mockStore.mockImplementation(() => ({
            feeDiscount: 0.1 // 10% civ discount
        }));

        const mockStream = {
            id: 'stream123',
            title: 'Test Stream',
            timeWatched: 10,
            paymentRate: 0.01,
            streamingActive: false,
            amountSpent: 0.1
        };

        // Record a payment with a 10% Fae discount
        const transaction = await transactionService.recordStreamPayment(
            '0x123456789',
            mockStream,
            0.1, // final amount
            0.1  // Fae discount 10%
        );

        // Total discount should be capped at 15% (10% Fae + 10% Civ would be 20%)
        expect(transaction.discountApplied).toBe(0.15);
        expect(transaction.originalAmount).toBeCloseTo(0.1176, 4);
    });
});

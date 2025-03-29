export interface MarketCondition {
    type: 'bull' | 'bear' | 'sideways' | 'volatile';
    volatility: number;  // 0-1
    trend: number;  // -1 to 1
    volume: number;  // 0-1
}

export const MARKET_SCENARIOS: Record<string, MarketCondition> = {
    BULL_MARKET: {
        type: 'bull',
        volatility: 0.4,
        trend: 0.7,
        volume: 0.8
    },
    BEAR_MARKET: {
        type: 'bear',
        volatility: 0.6,
        trend: -0.7,
        volume: 0.9
    },
    HIGH_VOLATILITY: {
        type: 'volatile',
        volatility: 0.9,
        trend: 0,
        volume: 1.0
    },
    CONSOLIDATION: {
        type: 'sideways',
        volatility: 0.2,
        trend: 0,
        volume: 0.3
    }
};

export const TRADING_STYLES = {
    CONSERVATIVE: {
        minConfidence: 0.7,
        maxRisk: 0.3,
        timeframe: 'long' as const,
        preferredConditions: ['sideways', 'bull']
    },
    AGGRESSIVE: {
        minConfidence: 0.4,
        maxRisk: 0.8,
        timeframe: 'short' as const,
        preferredConditions: ['volatile', 'bull', 'bear']
    },
    BALANCED: {
        minConfidence: 0.6,
        maxRisk: 0.5,
        timeframe: 'medium' as const,
        preferredConditions: ['bull', 'sideways']
    }
};

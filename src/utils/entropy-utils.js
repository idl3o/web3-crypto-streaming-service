/**
 * Measure entropy of content using various algorithms
 * @param {Buffer|string} content - Content to measure
 * @param {string} precision - Precision level (low, medium, high)
 * @returns {Object} Entropy measurements
 */
function measureEntropy(content, precision = 'medium') {
    const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

    // Calculate Shannon entropy
    const shannonEntropy = calculateShannonEntropy(contentBuffer);

    // Add additional entropy measurements based on precision
    const result = {
        shannon: shannonEntropy,
        normalized: shannonEntropy / 8 // Normalize to 0-1 range (8 bits max entropy)
    };

    if (precision === 'medium' || precision === 'high') {
        result.conditional = calculateConditionalEntropy(contentBuffer);
    }

    if (precision === 'high') {
        result.kolmogorov = estimateKolmogorovComplexity(contentBuffer);
        result.spectral = calculateSpectralEntropy(contentBuffer);
    }

    return result;
}

/**
 * Calculate Shannon entropy
 * @param {Buffer} buffer - Content buffer
 * @returns {number} Shannon entropy value
 */
function calculateShannonEntropy(buffer) {
    // Count byte frequencies
    const frequencies = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
        frequencies[buffer[i]]++;
    }

    // Calculate Shannon entropy
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
        const p = frequencies[i] / buffer.length;
        if (p > 0) {
            entropy -= p * Math.log2(p);
        }
    }

    return entropy;
}

/**
 * Calculate conditional entropy
 * @param {Buffer} buffer - Content buffer
 * @returns {number} Conditional entropy value
 */
function calculateConditionalEntropy(buffer) {
    if (buffer.length < 2) return 0;

    // Count digram frequencies
    const frequencies = {};
    const singletonFreq = new Array(256).fill(0);

    for (let i = 0; i < buffer.length - 1; i++) {
        const first = buffer[i];
        const second = buffer[i + 1];
        const key = (first << 8) | second;

        frequencies[key] = (frequencies[key] || 0) + 1;
        singletonFreq[first]++;
    }

    // Calculate conditional entropy H(Y|X)
    let conditionalEntropy = 0;
    for (let i = 0; i < 256; i++) {
        if (singletonFreq[i] === 0) continue;

        let innerSum = 0;
        for (let j = 0; j < 256; j++) {
            const key = (i << 8) | j;
            const jointProb = frequencies[key] / (buffer.length - 1) || 0;
            const condProb = frequencies[key] / singletonFreq[i] || 0;

            if (condProb > 0) {
                innerSum -= jointProb * Math.log2(condProb);
            }
        }
        conditionalEntropy += innerSum;
    }

    return conditionalEntropy;
}

/**
 * Estimate Kolmogorov complexity using compression ratio
 * @param {Buffer} buffer - Content buffer
 * @returns {number} Estimated complexity value
 */
function estimateKolmogorovComplexity(buffer) {
    // This is a simplified estimation using run-length encoding
    if (buffer.length === 0) return 0;

    let compressed = 0;
    let currentByte = buffer[0];
    let count = 1;

    for (let i = 1; i < buffer.length; i++) {
        if (buffer[i] === currentByte && count < 255) {
            count++;
        } else {
            compressed += 2; // Store (count, byte)
            currentByte = buffer[i];
            count = 1;
        }
    }

    compressed += 2; // Last run

    // Return normalized complexity (0-1 range)
    return compressed / buffer.length;
}

/**
 * Calculate spectral entropy using FFT
 * @param {Buffer} buffer - Content buffer
 * @returns {number} Spectral entropy value
 */
function calculateSpectralEntropy(buffer) {
    // This is a simplified version since full FFT would be complex
    // We'll use a simple windowed approach

    if (buffer.length < 4) return 0;

    const windowSize = Math.min(buffer.length, 256);
    const spectralPower = new Array(windowSize).fill(0);

    // Calculate simple spectral power by averaging squared differences
    for (let i = 0; i < windowSize; i++) {
        let sum = 0;
        for (let j = 0; j < buffer.length - i; j++) {
            const diff = buffer[j + i] - buffer[j];
            sum += diff * diff;
        }
        spectralPower[i] = sum / (buffer.length - i);
    }

    // Normalize
    const totalPower = spectralPower.reduce((a, b) => a + b, 0);
    if (totalPower === 0) return 0;

    const normalizedPower = spectralPower.map(p => p / totalPower);

    // Calculate entropy
    let entropy = 0;
    for (let i = 0; i < normalizedPower.length; i++) {
        if (normalizedPower[i] > 0) {
            entropy -= normalizedPower[i] * Math.log2(normalizedPower[i]);
        }
    }

    return entropy / Math.log2(windowSize); // Normalize to 0-1
}

module.exports = {
    measureEntropy,
    calculateShannonEntropy,
    calculateConditionalEntropy,
    estimateKolmogorovComplexity,
    calculateSpectralEntropy
};

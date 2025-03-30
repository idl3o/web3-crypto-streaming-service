/**
 * Babel configuration for Web3 Crypto Streaming Service
 * 
 * Optimizes compilation for:
 * - TypeScript to JavaScript transformation
 * - Modern JavaScript features (ES2020+)
 * - Web3/crypto library compatibility
 * - Browser compatibility and polyfills
 */
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: '14',
                    browsers: [
                        'last 2 Chrome versions',
                        'last 2 Firefox versions',
                        'last 2 Safari versions',
                        'last 2 Edge versions'
                    ]
                },
                useBuiltIns: 'usage',
                corejs: 3
            }
        ],
        '@babel/preset-typescript'
    ],
    plugins: [
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        ['@babel/plugin-proposal-class-properties', { loose: true }],
        '@babel/plugin-proposal-object-rest-spread',
        '@babel/plugin-transform-runtime',
        // Special handling for crypto & web3 libraries
        'babel-plugin-transform-remove-console',
        // Add crypto polyfills for browser environments
        'babel-plugin-transform-inline-environment-variables'
    ],
    env: {
        production: {
            plugins: [
                'babel-plugin-transform-remove-console'
            ]
        },
        development: {
            plugins: [
                'babel-plugin-transform-typescript-metadata'
            ]
        }
    },
    // Handle large integer values properly (important for crypto)
    assumptions: {
        noDocumentAll: true,
        noClassCalls: true,
        privateFieldsAsProperties: true,
        setPublicClassFields: true,
        superIsCallableConstructor: true
    }
};

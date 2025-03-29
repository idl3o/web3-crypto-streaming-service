import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWalletStore } from './wallet'
import { useFaeStore } from './fae'
import { useTransactionStore } from './transactionStore'
import { StreamingService, ContentStream, StreamingOptions } from '@/services/streamingService'
import { FaeIntegrationService } from '@/services/faeIntegrationService'
import { FaeToken } from '@/utils/fae-ecosystem'
import { TransactionType } from '@/services/transactionService'

/**
 * @category Streaming State
 * 
 * Manages content streaming sessions, payment channels, and streaming metadata
 */
export const useStreamingStore = defineStore('contentStreaming', () => {
    // State
    const streamingService = ref<StreamingService | null>(null)
    const faeIntegrationService = ref<FaeIntegrationService | null>(null)
    const activeStreams = ref<Map<string, ContentStream>>(new Map())
    const creatorEarnings = ref<number>(0)
    const viewerSpending = ref<number>(0)
    const isInitialized = ref<boolean>(false)
    const isStreaming = ref<boolean>(false)
    const currentContent = ref<ContentStream | null>(null)
    const contentLibrary = ref<ContentStream[]>([])
    const isLoadingContent = ref<boolean>(false)
    const contentLoadError = ref<string | null>(null)

    // Fae Rewards State
    const streamingRewards = ref<{
        essence: number;
        luminanceBoost: number;
        resonanceBoost: number;
        tokens: FaeToken[];
    }>({
        essence: 0,
        luminanceBoost: 0,
        resonanceBoost: 0,
        tokens: []
    })
    const streamingBoosts = ref<{
        costReduction: number;
        qualityBoost: boolean;
    }>({
        costReduction: 0,
        qualityBoost: false
    })
    const accumulatedRewards = ref<{
        essence: number;
        luminanceBoost: number;
        resonanceBoost: number;
    }>({
        essence: 0,
        luminanceBoost: 0,
        resonanceBoost: 0
    })

    // Getters
    const getActiveStreams = computed(() => {
        return Array.from(activeStreams.value.values())
    })

    const getTotalSpent = computed(() => {
        let total = 0
        activeStreams.value.forEach((stream) => {
            total += stream.amountSpent
        })
        return total
    })

    const hasActiveStreams = computed(() => {
        return activeStreams.value.size > 0
    })

    // New getters for Fae integration
    const effectivePaymentRate = computed(() => {
        if (!currentContent.value) return 0

        const baseRate = currentContent.value.paymentRate
        const discount = streamingBoosts.value.costReduction

        return baseRate * (1 - discount)
    })

    const hasActiveRewards = computed(() => {
        return streamingRewards.value.essence > 0 ||
            streamingRewards.value.tokens.length > 0
    })

    const formattedCostReduction = computed(() => {
        return `${Math.round(streamingBoosts.value.costReduction * 100)}%`
    })

    // Actions
    async function initialize() {
        if (isInitialized.value) return

        try {
            const walletStore = useWalletStore()
            const faeStore = useFaeStore()

            // Wait for wallet provider to be available
            if (!walletStore.provider) {
                await walletStore.connectWallet()
            }

            if (!walletStore.provider) {
                throw new Error('Wallet provider not available')
            }

            // Initialize streaming service
            streamingService.value = new StreamingService(walletStore.provider)

            // Initialize Fae integration service
            if (faeStore.faeEcosystem) {
                faeIntegrationService.value = new FaeIntegrationService(faeStore.faeEcosystem)

                // Calculate boosts from Fae tokens
                if (walletStore.account) {
                    calculateFaeBoosts()
                }
            }

            // Load content library
            await fetchContentLibrary()

            isInitialized.value = true
            console.log('Streaming service initialized')
        } catch (error) {
            console.error('Failed to initialize streaming service:', error)
            throw error
        }
    }

    async function fetchContentLibrary() {
        if (!streamingService.value) {
            await initialize()
        }

        isLoadingContent.value = true
        contentLoadError.value = null

        try {
            // This would be a call to fetch content from backend/blockchain
            // Mocking with sample data for now
            contentLibrary.value = [
                {
                    id: 'content-1',
                    title: 'Web3 Development Tutorial Series: Episode 1',
                    creator: 'Crypto Academy',
                    creatorAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                    url: 'https://ipfs.io/ipfs/QmV9tSDx9UiPeWExXEeH6aoDvmihvx6jD5eLb4jbTaKGps',
                    ipfsHash: 'QmV9tSDx9UiPeWExXEeH6aoDvmihvx6jD5eLb4jbTaKGps',
                    streamingActive: false,
                    timeWatched: 0,
                    amountSpent: 0,
                    paymentRate: 0.0001,
                    thumbnail: 'https://via.placeholder.com/320x180?text=Tutorial',
                    description: 'Learn how to build decentralized applications on Ethereum.',
                    tags: ['ethereum', 'web3', 'development', 'tutorial'],
                    license: 'standard',
                    createdAt: Date.now() - 3600000 // 1 hour ago
                },
                {
                    id: 'content-2',
                    title: 'Smart Contract Security Best Practices',
                    creator: 'Crypto Academy',
                    creatorAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                    url: 'https://ipfs.io/ipfs/QmV9tSDx9UiPeWExXEeH6aoDvmihvx6jD5eLb4jbTaKGp2',
                    ipfsHash: 'QmV9tSDx9UiPeWExXEeH6aoDvmihvx6jD5eLb4jbTaKGp2',
                    streamingActive: false,
                    timeWatched: 0,
                    amountSpent: 0,
                    paymentRate: 0.0001,
                    thumbnail: 'https://via.placeholder.com/320x180?text=Security',
                    description: 'Learn about common security vulnerabilities in smart contracts and how to avoid them.',
                } catch (error) {
                    console.error('Error fetching content library:', error)
                    contentLoadError.value = 'Failed to load content library'
                } finally {
                isLoadingContent.value = false
            }
        }

    async function getContentById(contentId: string): Promise<ContentStream | null> {
            if (!streamingService.value) {
                await initialize()
            }

            // Check if content is already loaded in library
            const existingContent = contentLibrary.value.find(c => c.id === contentId)
            if (existingContent) {
                return existingContent
            }

            // Otherwise fetch from service
            try {
                if (!streamingService.value) {
                    throw new Error('Streaming service not initialized')
                }

                const content = await streamingService.value.getContentById(contentId)
                return content
            } catch (error) {
                console.error(`Error fetching content ${contentId}:`, error)
                return null
            }
        }

        /**
         * Start streaming content to viewer with payment stream
         */
        async function startStream(contentId: string, options: StreamingOptions): Promise<ContentStream | null> {
            if (!streamingService.value) {
                await initialize()
            }

            try {
                // Apply Fae cost reduction if available
                const adjustedOptions = { ...options }
                if (streamingBoosts.value.costReduction > 0) {
                    adjustedOptions.paymentRate = options.paymentRate * (1 - streamingBoosts.value.costReduction)
                }

                // Start the stream with adjusted options
                const stream = await streamingService.value!.startStream(contentId, adjustedOptions)

                if (stream) {
                    activeStreams.value.set(contentId, stream)
                    currentContent.value = stream
                    isStreaming.value = true

                    // Reset streaming rewards
                    streamingRewards.value = {
                        essence: 0,
                        luminanceBoost: 0,
                        resonanceBoost: 0,
                        tokens: []
                    }

                    // Start tracking rewards
                    startTrackingFaeRewards(stream)
                }

                return stream
            } catch (error) {
                console.error('Failed to start stream:', error)
                throw error
            }
        }

        /**
         * Stop streaming content and finalize payment
         */
        async function stopStream(contentId: string): Promise<ContentStream | null> {
            if (!streamingService.value) {
                throw new Error('Streaming service not initialized')
            }

            try {
                // Finalize Fae rewards before stopping the stream
                await finalizeFaeRewards()

                const stream = await streamingService.value.stopStream(contentId)

                if (stream) {
                    activeStreams.value.delete(contentId)

                    if (currentContent.value?.id === contentId) {
                        currentContent.value = null
                        isStreaming.value = false
                    }

                    // Update spending metrics
                    viewerSpending.value += stream.amountSpent

                    // Record the transaction
                    const transactionStore = useTransactionStore()
                    await transactionStore.recordStreamPayment(
                        stream,
                        stream.amountSpent,
                        streamingBoosts.value.costReduction
                    )
                }

                return stream
            } catch (error) {
                console.error('Failed to stop stream:', error)
                throw error
            }
        }

        async function uploadContent(file: File, metadata: any): Promise<string> {
            if (!streamingService.value) {
                await initialize()
            }

            try {
                if (!streamingService.value) {
                    throw new Error('Streaming service not initialized')
                }

                // Upload the content
                const contentId = await streamingService.value.uploadContent(file, metadata)

                // Refresh content library after upload
                await fetchContentLibrary()

                return contentId
            } catch (error) {
                console.error('Failed to upload content:', error)
                throw error
            }
        }

        async function getCreatorStats(): Promise<any> {
            if (!streamingService.value) {
                await initialize()
            }

            try {
                const walletStore = useWalletStore()

                if (!streamingService.value || !walletStore.account) {
                    throw new Error('Streaming service not initialized or wallet not connected')
                }

                // Get creator stats
                const stats = await streamingService.value.getStreamingStats(walletStore.account)

                // Update store state
                creatorEarnings.value = stats.totalEarned

                return stats
            } catch (error) {
                console.error('Failed to fetch creator stats:', error)
                throw error
            }
        }

        // Clean up all streams on unmount or when leaving the app
        function cleanupStreams() {
            const streamIds = Array.from(activeStreams.value.keys())

            streamIds.forEach(async (id) => {
                try {
                    await stopStream(id)
                } catch (error) {
                    console.error(`Error cleaning up stream ${id}:`, error)
                }
            })
        }

        /**
         * Start tracking Fae rewards for the current stream
         */
        async function startTrackingFaeRewards(stream: ContentStream): Promise<void> {
            if (!faeIntegrationService.value || !stream) return

            const walletStore = useWalletStore()
            if (!walletStore.account) return

            // Set up interval to calculate rewards (every minute)
            const rewardInterval = setInterval(async () => {
                if (!isStreaming.value) {
                    clearInterval(rewardInterval)
                    return
                }

                // Calculate rewards for one minute of streaming
                const rewards = await faeIntegrationService.value!.calculateStreamingRewards(
                    walletStore.account!,
                    stream,
                    1 // 1 minute
                )

                // Update current rewards
                streamingRewards.value.essence += rewards.essence
                streamingRewards.value.luminanceBoost += rewards.luminanceBoost
                streamingRewards.value.resonanceBoost += rewards.resonanceBoost

                // Add new tokens to the list if they're not already there
                for (const token of rewards.tokens) {
                    if (!streamingRewards.value.tokens.some(t => t.id === token.id)) {
                        streamingRewards.value.tokens.push(token)
                    }
                }

                // Update accumulated rewards
                accumulatedRewards.value.essence += rewards.essence
                accumulatedRewards.value.luminanceBoost += rewards.luminanceBoost
                accumulatedRewards.value.resonanceBoost += rewards.resonanceBoost
            }, 60 * 1000) // Every minute

            // Store interval ID for cleanup
            return () => clearInterval(rewardInterval)
        }

        /**
         * Finalize Fae rewards when stopping a stream
         */
        async function finalizeFaeRewards(): Promise<void> {
            if (streamingRewards.value.essence <= 0) return

            const faeStore = useFaeStore()
            const walletStore = useWalletStore()
            const transactionStore = useTransactionStore()

            // Apply resonance and energy boosts to wallet
            if (streamingRewards.value.resonanceBoost > 0) {
                walletStore.resonanceScore = Math.min(
                    1.0,
                    walletStore.resonanceScore + streamingRewards.value.resonanceBoost
                )
            }

            if (streamingRewards.value.luminanceBoost > 0) {
                walletStore.energyLevel = Math.min(
                    10.0,
                    walletStore.energyLevel + (streamingRewards.value.luminanceBoost * 2)
                )
            }

            // Record the Fae transaction
            if (currentContent.value) {
                await transactionStore.recordFaeTransaction(
                    TransactionType.ESSENCE_EARNED,
                    0, // No ETH amount for essence
                    {
                        contentId: currentContent.value.id,
                        contentTitle: currentContent.value.title,
                        faeEssence: streamingRewards.value.essence,
                        luminanceBoost: streamingRewards.value.luminanceBoost,
                        resonanceBoost: streamingRewards.value.resonanceBoost,
                        timeWatched: currentContent.value.timeWatched
                    }
                )
            }

            // Refresh Fae tokens to capture the streaming rewards
            await faeStore.refreshUserTokens()

            // Reset streaming rewards
            streamingRewards.value = {
                essence: 0,
                luminanceBoost: 0,
                resonanceBoost: 0,
                tokens: []
            }
        }

        /**
         * Calculate Fae boosts for streaming
         */
        function calculateFaeBoosts(): void {
            if (!faeIntegrationService.value) return

            const walletStore = useWalletStore()
            if (!walletStore.account) return

            // Calculate boosts
            const boosts = faeIntegrationService.value.calculateStreamingBoosts(walletStore.account)

            // Update state
            streamingBoosts.value = boosts
        }

        return {
            // State
            activeStreams,
            creatorEarnings,
            viewerSpending,
            isInitialized,
            isStreaming,
            currentContent,
            contentLibrary,
            isLoadingContent,
            contentLoadError,

            // Fae integration state
            streamingRewards,
            streamingBoosts,
            accumulatedRewards,

            // Getters
            getActiveStreams,
            getTotalSpent,
            hasActiveStreams,
            effectivePaymentRate,
            hasActiveRewards,
            formattedCostReduction,

            // Actions
            initialize,
            fetchContentLibrary,
            getContentById,
            startStream,
            stopStream,
            uploadContent,
            getCreatorStats,
            cleanupStreams,
            calculateFaeBoosts
        }
    })

import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useContentStreamingStore = defineStore('contentStreaming', () => {
    const isStreaming = ref(false);

    function startStreaming() {
        isStreaming.value = true;
    }

    function stopStreaming() {
        isStreaming.value = false;
    }

    return {
        isStreaming,
        startStreaming,
        stopStreaming
    };
});

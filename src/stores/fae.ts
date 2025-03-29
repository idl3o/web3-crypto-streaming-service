import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWalletStore } from './wallet'
import { useTransactionStore } from './transactionStore'
import { TransactionType } from '@/services/transactionService'
import {
    FaeEcosystem,
    FaeToken,
    FaeRealm,
    FaeAffinity,
    FaeEnchantment,
    FaeQuest,
    QuestDifficulty,
    SeasonalCycle,
    SeasonalEvent,
    RealmMigration
} from '../utils/fae-ecosystem'

export const useFaeStore = defineStore('fae', () => {
    // Dependencies
    const walletStore = useWalletStore()

    // State
    const faeEcosystem = ref<FaeEcosystem>(new FaeEcosystem())
    const userTokens = ref<FaeToken[]>([])
    const selectedToken = ref<FaeToken | null>(null)
    const availableEnchantments = ref<Map<string, FaeEnchantment>>(new Map())
    const availableQuests = ref<Map<string, FaeQuest>>(new Map())
    const activeQuests = ref<FaeQuest[]>([])
    const completedQuests = ref<FaeQuest[]>([])
    const isLoading = ref<boolean>(false)
    const error = ref<string | null>(null)
    const lastHarvest = ref<number>(0)
    const lastQuestReward = ref<{ essence: number, enchantment: string | null } | null>(null)

    // Additional seasonal state
    const currentSeasonalEvent = ref<SeasonalEvent | undefined>(undefined)
    const ecosystemStatus = ref<{
        currentSeason: SeasonalCycle;
        seasonStartTime: number;
        relaunchAvailable: boolean;
        realmInfluence: Map<FaeRealm, number>;
        seasonalBonuses: SeasonalEvent['bonuses'];
    } | null>(null)
    const migrationHistory = ref<RealmMigration[]>([])
    const relaunchInProgress = ref<boolean>(false)
    const lastRelaunchResult = ref<{
        season: SeasonalCycle;
        migratedTokens: FaeToken[];
        essenceBonus: number;
    } | null>(null)

    // Getters
    const hasTokens = ref(false);

    function setHasTokens(value: boolean) {
        hasTokens.value = value;
    }

    const totalEssence = computed(() =>
        userTokens.value.reduce((sum, token) => sum + token.essence, 0)
    )

    const realmDistribution = computed(() => {
        const distribution: Record<FaeRealm, number> = {
            [FaeRealm.Seelie]: 0,
            [FaeRealm.Unseelie]: 0,
            [FaeRealm.Wyldwood]: 0,
            [FaeRealm.Twilight]: 0
        }

        userTokens.value.forEach(token => {
            distribution[token.realm]++
        })

        return distribution
    })

    const affinityDistribution = computed(() => {
        const distribution: Record<FaeAffinity, number> = {
            [FaeAffinity.Earth]: 0,
            [FaeAffinity.Air]: 0,
            [FaeAffinity.Fire]: 0,
            [FaeAffinity.Water]: 0,
            [FaeAffinity.Aether]: 0
        }

        userTokens.value.forEach(token => {
            distribution[token.affinity]++
        })

        return distribution
    })

    const questProgress = computed(() => {
        return {
            active: activeQuests.value.length,
            completed: completedQuests.value.length,
            total: availableQuests.value.size
        }
    })

    // Seasonal getters
    const currentSeason = computed(() => ecosystemStatus.value?.currentSeason)

    const isRelaunchAvailable = computed(() => ecosystemStatus.value?.relaunchAvailable || false)

    const seasonTimeRemaining = computed(() => {
        if (!ecosystemStatus.value) return 0

        const now = Date.now()
        const elapsed = now - ecosystemStatus.value.seasonStartTime
        const seasonDuration = 90 * 24 * 60 * 60 * 1000 // 90 days in ms

        return Math.max(0, seasonDuration - elapsed)
    })

    const seasonProgress = computed(() => {
        if (!ecosystemStatus.value) return 0

        const now = Date.now()
        const elapsed = now - ecosystemStatus.value.seasonStartTime
        const seasonDuration = 90 * 24 * 60 * 60 * 1000 // 90 days in ms

        return Math.min(1, elapsed / seasonDuration)
    })

    const mostInfluentialRealm = computed(() => {
        if (!ecosystemStatus.value?.realmInfluence) return null

        let maxInfluence = 0
        let maxRealm: FaeRealm | null = null

        for (const [realm, influence] of ecosystemStatus.value.realmInfluence.entries()) {
            if (influence > maxInfluence) {
                maxInfluence = influence
                maxRealm = realm
            }
        }

        return maxRealm
    })

    // Actions

    /**
     * Initialize the Fae ecosystem
     */
    async function initialize(): Promise<void> {
        if (!walletStore.isConnected) return

        isLoading.value = true
        error.value = null

        try {
            // Load enchantments
            availableEnchantments.value = faeEcosystem.value.getAvailableEnchantments()

            // Load quests
            availableQuests.value = faeEcosystem.value.getAvailableQuests()

            // Load tokens
            await refreshUserTokens()

            // Load quest status
            await refreshQuestStatus()

            // Load seasonal information
            ecosystemStatus.value = faeEcosystem.value.getEcosystemStatus()
            currentSeasonalEvent.value = faeEcosystem.value.getCurrentSeasonalEvent()

            // Load migration history if wallet is connected
            if (walletStore.account) {
                migrationHistory.value = faeEcosystem.value.getUserMigrationHistory(walletStore.account)
            }
        } catch (err: any) {
            console.error('Failed to initialize Fae ecosystem:', err)
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Refresh user tokens
     */
    async function refreshUserTokens(): Promise<void> {
        if (!walletStore.account) return

        userTokens.value = faeEcosystem.value.getUserTokens(walletStore.account)
    }

    /**
     * Refresh quest status
     */
    async function refreshQuestStatus(): Promise<void> {
        if (!walletStore.account) return

        activeQuests.value = faeEcosystem.value.getUserActiveQuests(walletStore.account)
        completedQuests.value = faeEcosystem.value.getUserCompletedQuests(walletStore.account)
    }

    /**
     * Mint a new Fae token
     */
    async function mintToken(): Promise<FaeToken | null> {
        if (!walletStore.isConnected) {
            error.value = 'Wallet not connected'
            return null
        }

        isLoading.value = true
        error.value = null

        try {
            // Use wallet store's ecosystem metrics to mint
            const token = await faeEcosystem.value.mintToken(
                walletStore.account!,
                walletStore.resonanceScore,
                walletStore.energyLevel
            )

            // Add to user tokens
            userTokens.value.push(token)

            // Record the transaction
            const transactionStore = useTransactionStore()
            await transactionStore.recordFaeTransaction(
                TransactionType.TOKEN_MINTED,
                0,
                {
                    tokenId: token.id,
                    realm: token.realm,
                    affinity: token.affinity,
                    luminance: token.luminance,
                    resonance: token.resonance,
                    essence: token.essence
                }
            )

            return token
        } catch (err: any) {
            console.error('Failed to mint Fae token:', err)
            error.value = err.message
            return null
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Apply an enchantment to a token
     */
    async function enchantToken(tokenId: string, enchantmentId: string): Promise<FaeToken | null> {
        if (!walletStore.isConnected) {
            error.value = 'Wallet not connected'
            return null
        }

        isLoading.value = true
        error.value = null

        try {
            const enchantment = availableEnchantments.value.get(enchantmentId)
            if (!enchantment) {
                error.value = 'Enchantment not found'
                return null
            }

            const token = userTokens.value.find(t => t.id === tokenId)
            if (!token) {
                error.value = 'Token not found'
                return null
            }

            const enchantedToken = await faeEcosystem.value.enchantToken(tokenId, enchantmentId)

            if (enchantedToken) {
                // Update user tokens
                const index = userTokens.value.findIndex(t => t.id === tokenId)
                if (index >= 0) {
                    userTokens.value[index] = enchantedToken
                }

                // Record the transaction
                const transactionStore = useTransactionStore()
                await transactionStore.recordFaeTransaction(
                    TransactionType.TOKEN_ENCHANTED,
                    0,
                    {
                        tokenId: enchantedToken.id,
                        enchantmentId: enchantmentId,
                        enchantmentName: enchantment.name,
                        luminanceBoost: enchantment.luminanceBoost,
                        resonanceBoost: enchantment.resonanceBoost,
                        essenceMultiplier: enchantment.essenceMultiplier
                    }
                )

                return enchantedToken
            }

            error.value = 'Token or enchantment not found'
            return null
        } catch (err: any) {
            console.error('Failed to enchant token:', err)
            error.value = err.message
            return null
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Harvest essence from a token
     */
    async function harvestEssence(tokenId: string): Promise<number> {
        if (!walletStore.isConnected) {
            error.value = 'Wallet not connected'
            return 0
        }

        isLoading.value = true
        error.value = null

        try {
            const essence = await faeEcosystem.value.harvestEssence(tokenId)

            if (essence > 0) {
                // Update last harvest amount
                lastHarvest.value = essence

                // Record the transaction
                const token = userTokens.value.find(t => t.id === tokenId)
                const transactionStore = useTransactionStore()
                await transactionStore.recordFaeTransaction(
                    TransactionType.ESSENCE_EARNED,
                    0,
                    {
                        tokenId: tokenId,
                        faeEssence: essence,
                        realm: token?.realm,
                        affinity: token?.affinity
                    }
                )

                // Refresh token data
                await refreshUserTokens()

                // Check quest completion after harvesting
                await checkActiveQuestCompletions()
            }

            return essence
        } catch (err: any) {
            console.error('Failed to harvest essence:', err)
            error.value = err.message
            return 0
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Start a new quest
     */
    async function startQuest(questId: string): Promise<boolean> {
        if (!walletStore.isConnected || !walletStore.account) {
            error.value = 'Wallet not connected'
            return false
        }

        isLoading.value = true
        error.value = null

        try {
            const result = await faeEcosystem.value.startQuest(walletStore.account, questId)

            if (result) {
                // Refresh quest status
                await refreshQuestStatus()
            }

            return result
        } catch (err: any) {
            console.error('Failed to start quest:', err)
            error.value = err.message
            return false
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Check if active quests are completed
     */
    async function checkActiveQuestCompletions(): Promise<void> {
        if (!walletStore.isConnected || !walletStore.account) return

        for (const quest of activeQuests.value) {
            await faeEcosystem.value.checkQuestCompletion(walletStore.account, quest.id)
        }

        // Refresh quest status
        await refreshQuestStatus()
    }

    /**
     * Claim reward for a completed quest
     */
    async function claimQuestReward(questId: string): Promise<{
        essence: number;
        enchantment: string | null;
    }> {
        if (!walletStore.isConnected || !walletStore.account) {
            error.value = 'Wallet not connected'
            return { essence: 0, enchantment: null }
        }

        isLoading.value = true
        error.value = null

        try {
            const reward = await faeEcosystem.value.claimQuestReward(walletStore.account, questId)

            if (reward.essence > 0 || reward.enchantment) {
                lastQuestReward.value = reward
            }

            return reward
        } catch (err: any) {
            console.error('Failed to claim quest reward:', err)
            error.value = err.message
            return { essence: 0, enchantment: null }
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Select a token to view details
     */
    function selectToken(tokenId: string): void {
        const token = userTokens.value.find(t => t.id === tokenId)
        selectedToken.value = token || null
    }

    /**
     * Refresh ecosystem seasonal status
     */
    async function refreshSeasonalStatus(): Promise<void> {
        ecosystemStatus.value = faeEcosystem.value.getEcosystemStatus()
        currentSeasonalEvent.value = faeEcosystem.value.getCurrentSeasonalEvent()

        if (walletStore.account) {
            migrationHistory.value = faeEcosystem.value.getUserMigrationHistory(walletStore.account)
        }
    }

    /**
     * Perform a seasonal relaunch
     */
    async function performRelaunch(): Promise<boolean> {
        if (!walletStore.isConnected || !walletStore.account) {
            error.value = 'Wallet not connected'
            return false
        }

        if (!ecosystemStatus.value?.relaunchAvailable) {
            error.value = 'Relaunch not available yet'
            return false
        }

        isLoading.value = true
        relaunchInProgress.value = true
        error.value = null

        try {
            const result = await faeEcosystem.value.performRelaunch(walletStore.account)
            lastRelaunchResult.value = result

            // Refresh everything after relaunch
            await refreshUserTokens()
            await refreshSeasonalStatus()
            await refreshQuestStatus()

            return true
        } catch (err: any) {
            console.error('Failed to perform relaunch:', err)
            error.value = err.message
            return false
        } finally {
            isLoading.value = false
            relaunchInProgress.value = false
        }
    }

    /**
     * Clear the last relaunch result notification
     */
    function clearRelaunchResult(): void {
        lastRelaunchResult.value = null
    }

    return {
        // State
        userTokens,
        selectedToken,
        availableEnchantments,
        availableQuests,
        activeQuests,
        completedQuests,
        isLoading,
        error,
        lastHarvest,
        lastQuestReward,
        currentSeasonalEvent,
        ecosystemStatus,
        migrationHistory,
        relaunchInProgress,
        lastRelaunchResult,

        // Getters
        hasTokens,
        setHasTokens,
        totalEssence,
        realmDistribution,
        affinityDistribution,
        questProgress,
        currentSeason,
        isRelaunchAvailable,
        seasonTimeRemaining,
        seasonProgress,
        mostInfluentialRealm,

        // Actions
        initialize,
        refreshUserTokens,
        refreshQuestStatus,
        mintToken,
        enchantToken,
        harvestEssence,
        selectToken,
        startQuest,
        checkActiveQuestCompletions,
        claimQuestReward,
        refreshSeasonalStatus,
        performRelaunch,
        clearRelaunchResult
    }
})

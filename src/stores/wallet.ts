import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ethers } from 'ethers'

/**
 * @category Blockchain State
 * @subcategory Wallet
 * 
 * Manages wallet connection, balances, and blockchain interaction
 */
export const useWalletStore = defineStore('wallet', () => {
    // State
    const provider = ref<ethers.providers.Web3Provider | null>(null)
    const account = ref<string | null>(null)
    const chainId = ref<number | null>(null)
    const balance = ref<number | null>(null)
    const isConnecting = ref(false)
    const error = ref<string | null>(null)
    const userProfile = ref<UserProfile | null>(null)

    // Ecosystem Finance State
    const affiliatePrograms = ref<Map<string, AffiliateProgram>>(new Map())
    const participatingPrograms = ref<string[]>([])
    const stakingBalances = ref<Map<string, number>>(new Map())
    const pendingRewards = ref<Map<string, EcosystemReward[]>>(new Map())
    const energyLevel = ref<number>(0)
    const resonanceScore = ref<number>(0)

    interface UserProfile {
        address: string;
        username?: string;
        avatar?: string;
        bio?: string;
        joinedAt: number;
    }

    interface AffiliateProgram {
        id: string;
        name: string;
        energyStake: number;
        resonanceScore: number;
        affiliatesCount: number;
        totalRewards: number;
        createdAt: number;
        minStake: number;
    }

    interface EcosystemReward {
        programId: string;
        amount: number;
        resonanceBonus: number;
        stakingMultiplier: number;
        timestamp: number;
        claimed: boolean;
    }

    // Getters
    const isConnected = computed(() => !!account.value)
    const shortAddress = computed(() => {
        if (!account.value) return ''
        return `${account.value.substring(0, 6)}...${account.value.substring(account.value.length - 4)}`
    })
    const networkName = computed(() => {
        if (!chainId.value) return 'Unknown Network'

        switch (chainId.value) {
            case 1: return 'Ethereum Mainnet'
            case 5: return 'Goerli Testnet'
            case 11155111: return 'Sepolia Testnet'
            case 137: return 'Polygon Mainnet'
            case 80001: return 'Mumbai Testnet'
            case 42161: return 'Arbitrum One'
            default: return `Chain ID ${chainId.value}`
        }
    })

    // Ecosystem Finance Getters
    const totalStaked = computed(() => {
        let sum = 0
        for (const amount of stakingBalances.value.values()) {
            sum += amount
        }
        return sum
    })

    const totalPendingRewards = computed(() => {
        let sum = 0
        for (const rewards of pendingRewards.value.values()) {
            sum += rewards.reduce((total, reward) => total + reward.amount, 0)
        }
        return sum
    })

    const availablePrograms = computed(() => {
        return Array.from(affiliatePrograms.value.values())
            .filter(program => program.minStake <= (balance.value || 0))
    })

    const participationMetrics = computed(() => {
        return {
            programsCount: participatingPrograms.value.length,
            totalStaked: totalStaked.value,
            pendingRewards: totalPendingRewards.value,
            energyLevel: energyLevel.value,
            resonanceScore: resonanceScore.value
        }
    })

    // Actions
    async function connectWallet() {
        if (isConnecting.value) return

        isConnecting.value = true
        error.value = null

        try {
            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error('No Ethereum wallet detected. Please install MetaMask.')
            }

            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' })

            // Create Web3Provider
            const web3Provider = new ethers.providers.Web3Provider(window.ethereum)
            provider.value = web3Provider

            // Get connected accounts
            const accounts = await web3Provider.listAccounts()

            if (accounts.length === 0) {
                throw new Error('No accounts found. Please connect to MetaMask.')
            }

            account.value = accounts[0]

            // Get chain ID
            const network = await web3Provider.getNetwork()
            chainId.value = network.chainId

            // Get ETH balance
            const rawBalance = await web3Provider.getBalance(account.value)
            balance.value = parseFloat(ethers.utils.formatEther(rawBalance))

            // Create or load user profile
            await loadUserProfile()

            // Set up event listeners
            setupEventListeners()

            console.log('Wallet connected:', account.value)
        } catch (err: any) {
            console.error('Failed to connect wallet:', err)
            error.value = err.message || 'Failed to connect wallet'
            disconnectWallet()
        } finally {
            isConnecting.value = false
        }
    }

    function disconnectWallet() {
        provider.value = null
        account.value = null
        chainId.value = null
        balance.value = null
        userProfile.value = null

        // Clean up event listeners
        if (window.ethereum) {
            window.ethereum.removeAllListeners('accountsChanged')
            window.ethereum.removeAllListeners('chainChanged')
        }
    }

    async function refreshBalance() {
        if (!provider.value || !account.value) return

        try {
            const rawBalance = await provider.value.getBalance(account.value)
            balance.value = parseFloat(ethers.utils.formatEther(rawBalance))
        } catch (err) {
            console.error('Failed to refresh balance:', err)
        }
    }

    async function switchNetwork(newChainId: number) {
        if (!provider.value) return

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${newChainId.toString(16)}` }]
            })

            // Chain ID will be updated by the chainChanged event listener
        } catch (err: any) {
            console.error('Failed to switch network:', err)
            error.value = err.message || 'Failed to switch network'
        }
    }

    function setupEventListeners() {
        if (!window.ethereum) return

        // Handle account changes
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length === 0) {
                disconnectWallet()
            } else {
                account.value = accounts[0]
                refreshBalance()
                loadUserProfile()
            }
        })

        // Handle chain changes
        window.ethereum.on('chainChanged', (newChainId: string) => {
            chainId.value = parseInt(newChainId, 16)
            refreshBalance()
        })

        // Handle wallet disconnect
        window.ethereum.on('disconnect', (error: { code: number; message: string }) => {
            console.log('Wallet disconnected:', error);
            disconnectWallet();
        });
    }

    async function loadUserProfile() {
        if (!account.value) return

        // In a real app, this might load from an API or blockchain
        // For now, we'll create a placeholder profile
        userProfile.value = {
            address: account.value,
            username: `user_${account.value.substring(2, 8)}`,
            avatar: `https://avatars.dicebear.com/api/identicon/${account.value}.svg`,
            joinedAt: Date.now()
        }
    }

    /**
     * Send a payment transaction
     */
    async function sendPayment(to: string, amount: string): Promise<string> {
        if (!provider.value || !account.value) {
            throw new Error('Wallet not connected')
        }

        try {
            const signer = provider.value.getSigner()
            const tx = await signer.sendTransaction({
                to,
                value: ethers.utils.parseEther(amount)
            })

            // Wait for transaction to be mined
            await tx.wait()

            // Refresh balance after transaction
            await refreshBalance()

            return tx.hash
        } catch (err: any) {
            console.error('Payment transaction failed:', err)
            throw new Error(err.message || 'Payment transaction failed')
        }
    }

    /**
     * Checks if the wallet has enough balance for a transaction
     */
    function hasSufficientBalance(amount: number): boolean {
        if (!balance.value) return false

        // Leave some ETH for gas
        const gasBuffer = 0.01
        return balance.value >= amount + gasBuffer
    }

    /**
     * Ecosystem Finance Actions
     */

    /**
     * Fetches available affiliate programs from the ecosystem
     */
    async function fetchAffiliatePrograms(): Promise<void> {
        if (!provider.value || !account.value) {
            throw new Error('Wallet not connected')
        }

        try {
            // In a real implementation, this would call a contract or API
            // This is a mock implementation
            const mockPrograms = [
                {
                    id: 'prog_1',
                    name: 'Content Creator Program',
                    energyStake: 1.5,
                    resonanceScore: 0.85,
                    affiliatesCount: 120,
                    totalRewards: 450.75,
                    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
                    minStake: 0.5
                },
                {
                    id: 'prog_2',
                    name: 'Streaming Provider Program',
                    energyStake: 2.0,
                    resonanceScore: 0.92,
                    affiliatesCount: 85,
                    totalRewards: 620.25,
                    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000, // 45 days ago
                    minStake: 1.0
                }
            ]

            affiliatePrograms.value = new Map(mockPrograms.map(p => [p.id, p]))
        } catch (err: any) {
            console.error('Failed to fetch affiliate programs:', err)
            throw new Error(err.message || 'Failed to fetch affiliate programs')
        }
    }

    /**
     * Join an affiliate program in the ecosystem
     */
    async function joinProgram(programId: string, stake: number): Promise<boolean> {
        if (!provider.value || !account.value) {
            throw new Error('Wallet not connected')
        }

        if (!hasSufficientBalance(stake)) {
            throw new Error('Insufficient balance for staking')
        }

        const program = affiliatePrograms.value.get(programId)
        if (!program) {
            throw new Error('Program not found')
        }

        if (stake < program.minStake) {
            throw new Error(`Minimum stake required: ${program.minStake}`)
        }

        try {
            // In a real implementation, this would call a contract function
            // For now, we'll just update our local state
            participatingPrograms.value.push(programId)
            stakingBalances.value.set(programId, stake)

            // Mock calculation of energy level and resonance based on stake
            energyLevel.value += stake * 0.5
            resonanceScore.value = Math.min(1.0, resonanceScore.value + stake * 0.1)

            // Mock transaction for staking
            await refreshBalance()

            return true
        } catch (err: any) {
            console.error('Failed to join program:', err)
            throw new Error(err.message || 'Failed to join program')
        }
    }

    /**
     * Calculate and distribute rewards for participating in programs
     */
    async function calculateRewards(programId: string): Promise<EcosystemReward[]> {
        if (!provider.value || !account.value) {
            throw new Error('Wallet not connected')
        }

        if (!participatingPrograms.value.includes(programId)) {
            throw new Error('Not participating in this program')
        }

        try {
            const stake = stakingBalances.value.get(programId) || 0
            const program = affiliatePrograms.value.get(programId)

            if (!program) {
                throw new Error('Program not found')
            }

            // Mock reward calculation based on stake, energy, and resonance
            const baseReward = stake * program.energyStake * 0.01
            const resonanceBonus = program.resonanceScore * resonanceScore.value
            const stakingMultiplier = Math.sqrt(stake)

            const reward: EcosystemReward = {
                programId,
                amount: baseReward * (1 + resonanceBonus),
                resonanceBonus,
                stakingMultiplier,
                timestamp: Date.now(),
                claimed: false
            }

            // Add to pending rewards
            const programRewards = pendingRewards.value.get(programId) || []
            programRewards.push(reward)
            pendingRewards.value.set(programId, programRewards)

            return [reward]
        } catch (err: any) {
            console.error('Failed to calculate rewards:', err)
            throw new Error(err.message || 'Failed to calculate rewards')
        }
    }

    /**
     * Claim pending rewards from a program
     */
    async function claimRewards(programId: string): Promise<number> {
        if (!provider.value || !account.value) {
            throw new Error('Wallet not connected')
        }

        try {
            const programRewards = pendingRewards.value.get(programId) || []
            const unclaimedRewards = programRewards.filter(r => !r.claimed)

            if (unclaimedRewards.length === 0) {
                return 0
            }

            const totalAmount = unclaimedRewards.reduce((sum, r) => sum + r.amount, 0)

            // Mark as claimed
            unclaimedRewards.forEach(r => r.claimed = true)
            pendingRewards.value.set(programId, programRewards)

            // In a real implementation, this would call a contract to claim rewards
            await refreshBalance()

            return totalAmount
        } catch (err: any) {
            console.error('Failed to claim rewards:', err)
            throw new Error(err.message || 'Failed to claim rewards')
        }
    }

    /**
     * Unstake from a program and exit
     */
    async function exitProgram(programId: string): Promise<boolean> {
        if (!provider.value || !account.value) {
            throw new Error('Wallet not connected')
        }

        try {
            // Check if participating
            if (!participatingPrograms.value.includes(programId)) {
                throw new Error('Not participating in this program')
            }

            // Remove from participating programs
            participatingPrograms.value = participatingPrograms.value.filter(id => id !== programId)

            // Get stake amount and remove
            const stake = stakingBalances.value.get(programId) || 0
            stakingBalances.value.delete(programId)

            // Adjust energy and resonance
            energyLevel.value = Math.max(0, energyLevel.value - stake * 0.5)
            resonanceScore.value = Math.max(0.1, resonanceScore.value - stake * 0.05)

            // Claim any pending rewards first
            await claimRewards(programId)

            // In a real implementation, this would call a contract to unstake
            await refreshBalance()

            return true
        } catch (err: any) {
            console.error('Failed to exit program:', err)
            throw new Error(err.message || 'Failed to exit program')
        }
    }

    return {
        // State
        provider,
        account,
        chainId,
        balance,
        isConnecting,
        error,
        userProfile,
        affiliatePrograms,
        participatingPrograms,
        stakingBalances,
        pendingRewards,
        energyLevel,
        resonanceScore,

        // Getters
        isConnected,
        shortAddress,
        networkName,
        totalStaked,
        totalPendingRewards,
        availablePrograms,
        participationMetrics,

        // Actions
        connectWallet,
        disconnectWallet,
        refreshBalance,
        switchNetwork,
        sendPayment,
        hasSufficientBalance,
        fetchAffiliatePrograms,
        joinProgram,
        calculateRewards,
        claimRewards,
        exitProgram
    }
})

// Add type definitions for window.ethereum
declare global {
    interface Window {
        ethereum?: any
    }
}

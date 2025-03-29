import { ethers } from 'ethers'

// Contract ABIs
import ProofOfExistenceABI from '../contracts/abis/ProofOfExistence.json'
import StreamPaymentABI from '../contracts/abis/StreamPayment.json'

// Contract addresses (from environment variables or config)
const POE_CONTRACT_ADDRESS = process.env.VUE_APP_POE_CONTRACT_ADDRESS
const PAYMENT_CONTRACT_ADDRESS = process.env.VUE_APP_PAYMENT_CONTRACT_ADDRESS

// Contract instances
let poeContract: ethers.Contract | null = null
let paymentContract: ethers.Contract | null = null

// Initialize contracts with provider
export function initializeContracts(provider: ethers.providers.Web3Provider) {
  try {
    // Initialize PoE contract
    poeContract = new ethers.Contract(
      POE_CONTRACT_ADDRESS || '',
      ProofOfExistenceABI,
      provider
    )
    
    // Initialize Payment contract
    paymentContract = new ethers.Contract(
      PAYMENT_CONTRACT_ADDRESS || '',
      StreamPaymentABI,
      provider
    )
    
    return { poeContract, paymentContract }
  } catch (error) {
    console.error('Failed to initialize contracts:', error)
    throw error
  }
}

// Get contract with signer for write operations
export function getSignedContract(
  provider: ethers.providers.Web3Provider,
  contractType: 'poe' | 'payment'
) {
  try {
    const signer = provider.getSigner()
    
    if (contractType === 'poe') {
      return new ethers.Contract(
        POE_CONTRACT_ADDRESS || '',
        ProofOfExistenceABI,
        signer
      )
    } else {
      return new ethers.Contract(
        PAYMENT_CONTRACT_ADDRESS || '',
        StreamPaymentABI,
        signer
      )
    }
  } catch (error) {
    console.error(`Failed to get signed ${contractType} contract:`, error)
    throw error
  }
}

// Proof of Existence contract functions
export async function storeContentHash(
  provider: ethers.providers.Web3Provider, 
  contentHash: string
): Promise<ethers.ContractTransaction> {
  const contract = getSignedContract(provider, 'poe')
  return await contract.storeHash(contentHash)
}

export async function verifyContentHash(
  provider: ethers.providers.Web3Provider,
  contentHash: string
): Promise<boolean> {
  const contract = poeContract || initializeContracts(provider).poeContract
  return await contract.verifyHash(contentHash)
}

// Payment Streaming contract functions
export async function createPaymentStream(
  provider: ethers.providers.Web3Provider,
  recipient: string,
  ratePerSecond: string,
  initialDeposit: string
): Promise<{ streamId: string, tx: ethers.ContractTransaction }> {
  const contract = getSignedContract(provider, 'payment')
  
  const weiValue = ethers.utils.parseEther(initialDeposit)
  const weiRate = ethers.utils.parseEther(ratePerSecond)
  
  const tx = await contract.createStream(recipient, weiRate, { 
    value: weiValue 
  })
  
  const receipt = await tx.wait()
  const event = receipt.events?.find(e => e.event === 'StreamCreated')
  const streamId = event?.args?.streamId
  
  return { streamId, tx }
}

export async function stopPaymentStream(
  provider: ethers.providers.Web3Provider,
  streamId: string
): Promise<ethers.ContractTransaction> {
  const contract = getSignedContract(provider, 'payment')
  return await contract.stopStream(streamId)
}

export async function addFundsToStream(
  provider: ethers.providers.Web3Provider,
  streamId: string,
  amount: string
): Promise<ethers.ContractTransaction> {
  const contract = getSignedContract(provider, 'payment')
  const weiValue = ethers.utils.parseEther(amount)
  
  return await contract.addFunds(streamId, { value: weiValue })
}

export async function withdrawFromStream(
  provider: ethers.providers.Web3Provider,
  streamId: string
): Promise<ethers.ContractTransaction> {
  const contract = getSignedContract(provider, 'payment')
  return await contract.withdraw(streamId)
}

export async function getStreamableAmount(
  provider: ethers.providers.Web3Provider,
  streamId: string
): Promise<string> {
  const contract = paymentContract || initializeContracts(provider).paymentContract
  const amount = await contract.getStreamableAmount(streamId)
  
  return ethers.utils.formatEther(amount)
}

export default {
  initializeContracts,
  getSignedContract,
  storeContentHash,
  verifyContentHash,
  createPaymentStream,
  stopPaymentStream,
  addFundsToStream,
  withdrawFromStream,
  getStreamableAmount
}

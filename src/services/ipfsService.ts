/**
 * IPFS Service for content upload and retrieval
 */

import axios from 'axios';
import { create, IPFSHTTPClient } from 'ipfs-http-client'
import { Buffer } from 'buffer'
import { networkService } from './networkService'

// IPFS Gateway URLs
const IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/'
];

// IPFS configuration
const IPFS_API_URL = process.env.VUE_APP_IPFS_API_URL || 'https://ipfs.infura.io:5001/api/v0'
const IPFS_GATEWAY_URL = process.env.VUE_APP_IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/'
const IPFS_FALLBACK_GATEWAY = process.env.VUE_APP_IPFS_FALLBACK_GATEWAY || 'https://cloudflare-ipfs.com/ipfs/'

const IPFS_PROJECT_ID = process.env.VUE_APP_IPFS_PROJECT_ID || ''
const IPFS_PROJECT_SECRET = process.env.VUE_APP_IPFS_PROJECT_SECRET || ''

// Max retry attempts for IPFS operations
const MAX_RETRIES = parseInt(process.env.VUE_APP_NETWORK_MAX_RETRIES || '3', 10)
const RETRY_DELAY = parseInt(process.env.VUE_APP_NETWORK_RETRY_DELAY || '1000', 10)

// Fallback to local node if no auth is provided
let ipfs: IPFSHTTPClient
let useGatewayFallback = false

// Initialize IPFS client with authentication
function initIPFS(): IPFSHTTPClient {
  if (ipfs) return ipfs
  
  try {
    if (IPFS_PROJECT_ID && IPFS_PROJECT_SECRET) {
      // Using Infura or similar service with authentication
      const auth = 'Basic ' + Buffer.from(IPFS_PROJECT_ID + ':' + IPFS_PROJECT_SECRET).toString('base64')
      
      ipfs = create({
        url: IPFS_API_URL,
        headers: {
          authorization: auth
        }
      })
    } else {
      // Using public gateway or local node
      ipfs = create({ url: IPFS_API_URL })
    }
    
    console.log('IPFS client initialized successfully')
    return ipfs
  } catch (error) {
    console.error('Error initializing IPFS client:', error)
    throw new Error('Failed to initialize IPFS client')
  }
}

// Upload file to IPFS with retry logic
export async function uploadToIPFS(file: File | Blob): Promise<string> {
  let attempts = 0
  let lastError: any

  while (attempts < MAX_RETRIES) {
    try {
      const client = initIPFS()
      
      const result = await client.add(file, {
        progress: (prog) => console.log(`IPFS upload progress: ${prog}`)
      })
      
      return result.cid.toString()
    } catch (error: any) {
      lastError = error
      attempts++
      
      // Special handling for HTTP/2 protocol errors
      if (error.message?.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
        console.warn('HTTP/2 protocol error detected during IPFS upload. Retrying with HTTP/1.1 settings...')
        
        // Reset IPFS client to force recreation with HTTP/1.1 settings
        ipfs = undefined as unknown as IPFSHTTPClient
      }
      
      if (attempts < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, attempts - 1)
        console.warn(`IPFS upload attempt ${attempts} failed. Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  console.error('All IPFS upload attempts failed:', lastError)
  throw new Error('Failed to upload to IPFS after multiple attempts')
}

// Upload JSON metadata to IPFS
export async function uploadJSONToIPFS(data: any): Promise<string> {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  
  return await uploadToIPFS(blob)
}

// Get content from IPFS with gateway fallback
export async function getFromIPFS(cid: string): Promise<Uint8Array> {
  // Try primary gateway first, then fallback if needed
  if (!useGatewayFallback) {
    try {
      const client = initIPFS()
      const chunks = []
      
      for await (const chunk of client.cat(cid)) {
        chunks.push(chunk)
      }
      
      return concatUint8Arrays(chunks)
    } catch (error) {
      console.warn('Error retrieving from primary IPFS gateway, trying fallback:', error)
      useGatewayFallback = true
    }
  }
  
  // Use HTTP fallback via fetch API
  try {
    // Create Axios instance with retry capability
    const axios = networkService.createAxiosInstance()
    
    // Try the fallback gateway
    const response = await axios.get(`${IPFS_FALLBACK_GATEWAY}${cid}`, {
      responseType: 'arraybuffer'
    })
    
    return new Uint8Array(response.data)
  } catch (error) {
    console.error('Error retrieving from fallback IPFS gateway:', error)
    throw new Error('Failed to retrieve from IPFS')
  }
}

// Get JSON from IPFS
export async function getJSONFromIPFS(cid: string): Promise<any> {
  try {
    const data = await getFromIPFS(cid)
    const text = new TextDecoder().decode(data)
    return JSON.parse(text)
  } catch (error) {
    console.error('Error retrieving JSON from IPFS:', error)
    throw new Error('Failed to retrieve JSON from IPFS')
  }
}

// Helper function to concatenate Uint8Arrays
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  
  return result
}

// Get public gateway URL with automatic fallback
export function getIPFSGatewayURL(cid: string): string {
  return useGatewayFallback ? 
    `${IPFS_FALLBACK_GATEWAY}${cid}` : 
    `${IPFS_GATEWAY_URL}${cid}`
}

export default {
  initIPFS,
  uploadToIPFS,
  uploadJSONToIPFS,
  getFromIPFS,
  getJSONFromIPFS,
  getIPFSGatewayURL
}

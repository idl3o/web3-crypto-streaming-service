<template>
  <div class="content-create">
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="h3">Create New Content</h1>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary" @click="saveDraft">
            <i class="fas fa-save me-1"></i> Save Draft
          </button>
          <button class="btn btn-primary" @click="publishContent" :disabled="!isFormValid || isPublishing">
            <span v-if="isPublishing">
              <i class="fas fa-spinner fa-spin me-1"></i> Publishing...
            </span>
            <span v-else>
              <i class="fas fa-upload me-1"></i> Publish
            </span>
          </button>
        </div>
      </div>
      
      <!-- Creation Progress Indicator -->
      <div class="creation-progress mb-4">
        <div class="progress" style="height: 4px;">
          <div class="progress-bar" role="progressbar" :style="{ width: progressPercent + '%' }" 
               aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div class="d-flex justify-content-between mt-2">
          <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
            <div class="step-number">1</div>
            <div class="step-label">Basics</div>
          </div>
          <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
            <div class="step-number">2</div>
            <div class="step-label">Upload</div>
          </div>
          <div class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
            <div class="step-number">3</div>
            <div class="step-label">Monetize</div>
          </div>
          <div class="step" :class="{ active: currentStep >= 4, completed: currentStep > 4 }">
            <div class="step-number">4</div>
            <div class="step-label">Publish</div>
          </div>
        </div>
      </div>

      <!-- Content Creation Form Steps -->
      <div class="row">
        <div class="col-lg-8 mb-4">
          <!-- Step 1: Basics -->
          <div v-if="currentStep === 1" class="card border-0 shadow-sm">
            <div class="card-body">
              <h5 class="card-title mb-4">Content Details</h5>
              <div class="mb-3">
                <label for="content-title" class="form-label">Title</label>
                <input type="text" class="form-control" id="content-title" v-model="contentData.title" 
                       placeholder="Enter a captivating title">
              </div>
              
              <div class="mb-3">
                <label for="content-description" class="form-label">Description</label>
                <textarea class="form-control" id="content-description" rows="3" v-model="contentData.description"
                          placeholder="Describe your content"></textarea>
              </div>
              
              <div class="mb-3">
                <label class="form-label d-block">Content Type</label>
                <div class="btn-group" role="group">
                  <input type="radio" class="btn-check" name="contentType" id="type-video" 
                         v-model="contentData.contentType" value="video" autocomplete="off" checked>
                  <label class="btn btn-outline-primary" for="type-video">
                    <i class="fas fa-video me-1"></i> Video
                  </label>
                  
                  <input type="radio" class="btn-check" name="contentType" id="type-audio" 
                         v-model="contentData.contentType" value="audio" autocomplete="off">
                  <label class="btn btn-outline-primary" for="type-audio">
                    <i class="fas fa-music me-1"></i> Audio
                  </label>
                  
                  <input type="radio" class="btn-check" name="contentType" id="type-text" 
                         v-model="contentData.contentType" value="text" autocomplete="off">
                  <label class="btn btn-outline-primary" for="type-text">
                    <i class="fas fa-file-alt me-1"></i> Text
                  </label>
                </div>
              </div>
              
              <div class="mb-3">
                <label for="content-tags" class="form-label">Tags</label>
                <input type="text" class="form-control" id="content-tags" v-model="tagsInput"
                       placeholder="Enter tags separated by commas">
                <small class="text-muted">Add relevant tags to help viewers find your content</small>
                <div class="mt-2">
                  <span v-for="(tag, index) in contentData.tags" :key="index" class="badge bg-primary me-1 mb-1">
                    {{ tag }}
                    <i class="fas fa-times ms-1" style="cursor: pointer" @click="removeTag(index)"></i>
                  </span>
                </div>
              </div>
              
              <div class="mb-3">
                <label for="content-category" class="form-label">Category</label>
                <select class="form-select" id="content-category" v-model="contentData.category">
                  <option value="">Select a category</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="blockchain">Blockchain</option>
                  <option value="defi">DeFi</option>
                  <option value="nft">NFTs</option>
                  <option value="dao">DAOs</option>
                  <option value="web3">Web3</option>
                  <option value="tutorials">Tutorials</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- Step 2: Upload -->
          <div v-if="currentStep === 2" class="card border-0 shadow-sm">
            <div class="card-body">
              <h5 class="card-title mb-4">Upload Content</h5>
              <div class="content-upload-area mb-4">
                <div v-if="!contentData.file" class="upload-placeholder text-center p-4 border border-dashed rounded"
                     @dragover.prevent @dragenter.prevent="dragover = true"
                     @dragleave.prevent="dragover = false"
                     @drop.prevent="onFileDrop"
                     :class="{ 'dragover': dragover }">
                  <div class="row align-items-center">
                    <div class="col-md-6 mb-3 mb-md-0">
                      <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                      <h5>Drag & Drop</h5>
                      <p class="text-muted mb-0">Supports video, audio, and document files</p>
                    </div>
                    <div class="col-md-6">
                      <p class="mb-2">Or select upload method:</p>
                      <div class="d-flex flex-wrap gap-2 justify-content-center">
                        <button class="btn btn-primary" @click="triggerFileInput">
                          <i class="fas fa-laptop me-1"></i> Local File
                        </button>
                        <div class="dropdown">
                          <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            More Options
                          </button>
                          <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#"><i class="fab fa-google-drive me-2"></i>Google Drive</a></li>
                            <li><a class="dropdown-item" href="#"><i class="fab fa-dropbox me-2"></i>Dropbox</a></li>
                            <li><a class="dropdown-item" href="#"><i class="fas fa-link me-2"></i>URL</a></li>
                          </ul>
                        </div>
                      </div>
                      <input ref="fileInput" type="file" class="d-none" @change="onFileSelect">
                    </div>
                  </div>
                </div>
                
                <div v-else class="upload-preview">
                  <div class="card">
                    <div class="card-body">
                      <div class="d-flex align-items-center">
                        <i :class="`fas fa-${getFileIcon(contentData.file)} fa-2x text-primary me-3`"></i>
                        <div class="flex-grow-1">
                          <h6 class="upload-filename mb-1">{{ contentData.file.name }}</h6>
                          <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1" style="height: 5px;">
                              <div class="progress-bar" role="progressbar" :style="{ width: uploadProgress + '%' }"></div>
                            </div>
                            <span class="ms-2 small">{{ uploadProgress }}%</span>
                          </div>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger ms-3" @click="removeFile">
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mb-3" v-if="contentData.contentType === 'text'">
                <label class="form-label">Content Text</label>
                <div class="editor-toolbar border mb-2 p-2 bg-light rounded">
                  <button class="btn btn-sm btn-outline-secondary me-1"><i class="fas fa-bold"></i></button>
                  <button class="btn btn-sm btn-outline-secondary me-1"><i class="fas fa-italic"></i></button>
                  <button class="btn btn-sm btn-outline-secondary me-1"><i class="fas fa-underline"></i></button>
                  <button class="btn btn-sm btn-outline-secondary me-1"><i class="fas fa-list"></i></button>
                  <button class="btn btn-sm btn-outline-secondary me-1"><i class="fas fa-list-ol"></i></button>
                </div>
                <textarea class="form-control" rows="10" placeholder="Write your content here..." v-model="contentData.textContent"></textarea>
              </div>
              
              <div class="mb-3">
                <label for="content-thumbnail" class="form-label">Thumbnail</label>
                <div class="input-group mb-3">
                  <input type="file" class="form-control" id="content-thumbnail" accept="image/*" @change="onThumbnailSelect">
                </div>
                <div v-if="thumbnailPreview" class="thumbnail-preview mb-2">
                  <img :src="thumbnailPreview" alt="Thumbnail Preview" class="img-thumbnail" style="max-height: 150px;">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 3: Monetize -->
          <div v-if="currentStep === 3" class="card border-0 shadow-sm">
            <div class="card-body">
              <h5 class="card-title mb-4">Monetization Settings</h5>
              
              <div class="form-check form-switch mb-4">
                <input class="form-check-input" type="checkbox" id="monetization-enabled" v-model="contentData.monetizationEnabled">
                <label class="form-check-label" for="monetization-enabled">Enable monetization</label>
              </div>
              
              <div v-if="contentData.monetizationEnabled">
                <!-- Monetization Presets -->
                <div class="mb-4">
                  <label class="form-label">Quick Presets</label>
                  <div class="d-grid gap-2">
                    <button :class="['btn text-start preset-btn', 
                      contentData.pricingPreset === 'standard' ? 'btn-primary' : 'btn-outline-primary']" 
                      @click="selectPricingPreset('standard')">
                      <i class="fas fa-bolt me-1"></i> Standard Rate
                      <small class="d-block">0.0001 ETH/min (≈$0.20/min)</small>
                    </button>
                    <button :class="['btn text-start preset-btn', 
                      contentData.pricingPreset === 'premium' ? 'btn-primary' : 'btn-outline-primary']" 
                      @click="selectPricingPreset('premium')">
                      <i class="fas fa-star me-1"></i> Premium Rate
                      <small class="d-block">0.0003 ETH/min (≈$0.60/min)</small>
                    </button>
                    <button :class="['btn text-start preset-btn', 
                      contentData.pricingPreset === 'free' ? 'btn-primary' : 'btn-outline-primary']"
                      @click="selectPricingPreset('free')">
                      <i class="fas fa-heart me-1"></i> Free Content
                      <small class="d-block">No payment required to view</small>
                    </button>
                  </div>
                </div>
                
                <div class="mb-3">
                  <label for="price-model" class="form-label">Pricing Model</label>
                  <select class="form-select" id="price-model" v-model="contentData.pricingModel">
                    <option value="free">Free</option>
                    <option value="one-time">One-time Payment</option>
                    <option value="subscription">Subscription</option>
                    <option value="stream">Pay-per-second Stream</option>
                  </select>
                </div>
                
                <div class="mb-3">
                  <label for="token-type" class="form-label">Token</label>
                  <select class="form-select" id="token-type" v-model="contentData.token">
                    <option value="eth">ETH</option>
                    <option value="usdc">USDC</option>
                    <option value="dai">DAI</option>
                    <option value="custom">Custom Token</option>
                  </select>
                </div>
                
                <div class="mb-3">
                  <label for="content-price" class="form-label">Price</label>
                  <div class="input-group">
                    <input type="number" class="form-control" id="content-price" v-model="contentData.price" placeholder="0.00">
                    <span class="input-group-text">{{ contentData.token.toUpperCase() }}</span>
                  </div>
                  <small class="text-muted">≈ ${{ estimatedUsdPrice }} USD</small>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 4: Review & Publish -->
          <div v-if="currentStep === 4" class="card border-0 shadow-sm">
            <div class="card-body">
              <h5 class="card-title mb-4">Review & Publish</h5>
              
              <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i> 
                Review your content details below before publishing. Once published, your content will be stored on IPFS and available to stream.
              </div>
              
              <div class="content-preview mb-4">
                <div class="row">
                  <div class="col-md-4">
                    <div class="mb-3">
                      <img :src="thumbnailPreview || 'https://via.placeholder.com/320x180?text=Thumbnail'" 
                          alt="Thumbnail" class="img-fluid rounded">
                    </div>
                  </div>
                  <div class="col-md-8">
                    <h4>{{ contentData.title || 'Untitled Content' }}</h4>
                    <p>{{ contentData.description || 'No description provided' }}</p>
                    <div class="d-flex mb-2">
                      <span class="badge bg-primary me-2">{{ contentData.contentType }}</span>
                      <span v-if="contentData.monetizationEnabled && contentData.pricingModel === 'stream'" class="badge bg-success">
                        {{ contentData.price || '0.0001' }} {{ contentData.token.toUpperCase() }}/min
                      </span>
                      <span v-else-if="contentData.monetizationEnabled" class="badge bg-success">
                        {{ contentData.price || '0' }} {{ contentData.token.toUpperCase() }}
                      </span>
                      <span v-else class="badge bg-secondary">Free</span>
                    </div>
                    <div>
                      <span v-for="(tag, index) in contentData.tags" :key="index" class="badge bg-light text-dark me-1 mb-1">
                        #{{ tag }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mb-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="ipfs-storage" v-model="contentData.storeOnIpfs">
                  <label class="form-check-label" for="ipfs-storage">
                    Store on IPFS (decentralized storage network)
                  </label>
                </div>
              </div>
              
              <div class="mb-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="terms-agree" v-model="termsAgreed">
                  <label class="form-check-label" for="terms-agree">
                    I agree to the <a href="#" target="_blank">Terms of Service</a> and content guidelines
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-lg-4">
          <!-- Publishing Checklist -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-white">
              <h5 class="card-title mb-0">Publishing Checklist</h5>
            </div>
            <div class="card-body">
              <ul class="list-group list-group-flush">
                <li class="list-group-item d-flex align-items-center">
                  <i :class="`fas ${isWalletConnected ? 'fa-check-circle text-success' : 'fa-circle text-muted'} me-2`"></i>
                  <span>Wallet connected</span>
                </li>
                <li class="list-group-item d-flex align-items-center">
                  <i :class="`fas ${isBasicInfoComplete ? 'fa-check-circle text-success' : 'fa-circle text-muted'} me-2`"></i>
                  <span>Content details complete</span>
                </li>
                <li class="list-group-item d-flex align-items-center">
                  <i :class="`fas ${isContentUploaded ? 'fa-check-circle text-success' : 'fa-circle text-muted'} me-2`"></i>
                  <span>Content uploaded</span>
                </li>
                <li class="list-group-item d-flex align-items-center">
                  <i :class="`fas ${isMonetizationConfigured ? 'fa-check-circle text-success' : 'fa-circle text-muted'} me-2`"></i>
                  <span>Monetization configured</span>
                </li>
              </ul>
            </div>
          </div>
          
          <!-- Wallet Status -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-white">
              <h5 class="card-title mb-0">Wallet Status</h5>
            </div>
            <div class="card-body">
              <div v-if="isWalletConnected">
                <div class="d-flex align-items-center mb-3">
                  <div class="avatar me-3">
                    <img :src="walletAvatar" alt="Wallet" class="rounded-circle" width="40" height="40">
                  </div>
                  <div>
                    <div class="fw-bold">{{ walletStore.shortAddress }}</div>
                    <div class="small text-muted">{{ walletStore.networkName }}</div>
                  </div>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <span>Balance:</span>
                  <span class="fw-bold">{{ walletStore.balance }} ETH</span>
                </div>
              </div>
              <div v-else>
                <div class="text-center py-3">
                  <i class="fas fa-wallet fa-2x text-muted mb-3"></i>
                  <p>Connect your wallet to publish content</p>
                  <button class="btn btn-primary" @click="connectWallet">
                    <i class="fas fa-link me-1"></i> Connect Wallet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Navigation Buttons -->
      <div class="d-flex justify-content-between my-4">
        <button class="btn btn-outline-secondary" @click="prevStep" :disabled="currentStep === 1">
          <i class="fas fa-arrow-left me-1"></i> Previous
        </button>
        <button v-if="currentStep < 4" class="btn btn-primary" @click="nextStep">
          Next <i class="fas fa-arrow-right ms-1"></i>
        </button>
        <button v-else class="btn btn-success" @click="publishContent" :disabled="!isFormValid || !termsAgreed || isPublishing">
          <i class="fas fa-upload me-1"></i> Publish Content
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useStreamingStore } from '@/stores/contentStreaming'
import { create } from 'ipfs-http-client'
import { ethers } from 'ethers'

// IPFS client setup
const ipfs = create({ url: 'https://ipfs.infura.io:5001/api/v0' })

// Router
const router = useRouter()

// Stores
const walletStore = useWalletStore()
const streamingStore = useStreamingStore()

// Form state
const currentStep = ref(1)
const contentData = reactive({
  title: '',
  description: '',
  contentType: 'video',
  tags: [],
  category: '',
  file: null,
  textContent: '',
  thumbnail: null,
  monetizationEnabled: true,
  pricingPreset: 'standard',
  pricingModel: 'stream',
  token: 'eth',
  price: 0.0001,
  storeOnIpfs: true
})

// UI state
const tagsInput = ref('')
const dragover = ref(false)
const fileInput = ref(null)
const uploadProgress = ref(0)
const thumbnailPreview = ref(null)
const termsAgreed = ref(false)
const isPublishing = ref(false)

// Computed properties
const isWalletConnected = computed(() => walletStore.isConnected)
const progressPercent = computed(() => (currentStep.value / 4) * 100)
const walletAvatar = computed(() => walletStore.userProfile?.avatar || `https://avatars.dicebear.com/api/identicon/${walletStore.account || 'user'}.svg`)
const estimatedUsdPrice = computed(() => {
  // Simple conversion - would use real rates in production
  const price = parseFloat(contentData.price) || 0
  return (contentData.token === 'eth' ? price * 2000 : price).toFixed(2)
})

const isBasicInfoComplete = computed(() => {
  return contentData.title.trim() !== '' && 
         contentData.description.trim() !== '' && 
         contentData.category !== ''
})

const isContentUploaded = computed(() => {
  return contentData.contentType === 'text' ? 
    contentData.textContent.trim() !== '' : 
    contentData.file !== null
})

const isMonetizationConfigured = computed(() => {
  if (!contentData.monetizationEnabled) return true
  return contentData.pricingModel !== '' && 
         (contentData.price > 0 || contentData.pricingModel === 'free')
})

const isFormValid = computed(() => {
  return isBasicInfoComplete.value && 
         isContentUploaded.value && 
         isMonetizationConfigured.value &&
         isWalletConnected.value
})

// Methods
function triggerFileInput() {
  fileInput.value.click()
}

function onFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    contentData.file = file
    simulateUpload()
  }
}

function onFileDrop(event) {
  dragover.value = false
  const file = event.dataTransfer.files[0]
  if (file) {
    contentData.file = file
    simulateUpload()
  }
}

function simulateUpload() {
  uploadProgress.value = 0
  const interval = setInterval(() => {
    uploadProgress.value += 5
    if (uploadProgress.value >= 100) {
      clearInterval(interval)
    }
  }, 200)
}

function removeFile() {
  contentData.file = null
  uploadProgress.value = 0
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function onThumbnailSelect(event) {
  const file = event.target.files[0]
  if (file) {
    contentData.thumbnail = file
    const reader = new FileReader()
    reader.onload = e => {
      thumbnailPreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

function getFileIcon(file) {
  const type = file.type
  if (type.includes('video')) return 'file-video'
  if (type.includes('audio')) return 'file-audio'
  if (type.includes('image')) return 'file-image'
  if (type.includes('pdf')) return 'file-pdf'
  return 'file'
}

function selectPricingPreset(preset) {
  contentData.pricingPreset = preset
  
  switch (preset) {
    case 'standard':
      contentData.pricingModel = 'stream'
      contentData.price = 0.0001
      break
    case 'premium':
      contentData.pricingModel = 'stream'
      contentData.price = 0.0003
      break
    case 'free':
      contentData.pricingModel = 'free'
      contentData.price = 0
      break
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function nextStep() {
  if (currentStep.value < 4) {
    // Simple validation before proceeding
    if (currentStep.value === 1 && !isBasicInfoComplete.value) {
      alert('Please complete all required fields before proceeding')
      return
    }
    
    if (currentStep.value === 2 && !isContentUploaded.value) {
      alert('Please upload your content before proceeding')
      return
    }
    
    currentStep.value++
  }
}

async function connectWallet() {
  try {
    await walletStore.connectWallet()
  } catch (error) {
    console.error('Failed to connect wallet:', error)
  }
}

async function saveDraft() {
  // Save draft logic
  console.log('Saving draft:', contentData)
  
  // In a real application, this would save to local storage or backend
  alert('Draft saved successfully!')
}

async function publishContent() {
  if (!isFormValid.value || !termsAgreed.value) return
  
  isPublishing.value = true
  
  try {
    // Prepare metadata
    const metadata = {
      title: contentData.title,
      description: contentData.description,
      contentType: contentData.contentType,
      tags: contentData.tags,
      category: contentData.category,
      monetization: {
        enabled: contentData.monetizationEnabled,
        model: contentData.pricingModel,
        token: contentData.token,
        price: contentData.price
      },
      createdAt: Date.now()
    }
    
    let contentFile = contentData.file
    
    // For text content, create a file from the text
    if (contentData.contentType === 'text' && contentData.textContent) {
      const blob = new Blob([contentData.textContent], { type: 'text/plain' })
      contentFile = new File([blob], `${contentData.title.replace(/\s+/g, '-')}.txt`, { type: 'text/plain' })
    }
    
    // Upload content to IPFS
    const contentResult = await ipfs.add(contentFile)
    metadata.contentHash = contentResult.cid.toString()
    
    // Upload metadata to IPFS
    const metadataResult = await ipfs.add(JSON.stringify(metadata))
    const metadataHash = metadataResult.cid.toString()
    
    // PoE: Store metadata hash on the blockchain
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(
      'YOUR_CONTRACT_ADDRESS', // Replace with your deployed contract address
      ['function storeHash(string memory hash) public'], // Replace with your contract ABI
      signer
    )
    const tx = await contract.storeHash(metadataHash)
    await tx.wait()
    
    console.log('Content published with metadata hash:', metadataHash)
    
    // Redirect to content management page
    router.push({
      name: 'content-manage',
      query: { published: 'success' }
    })
  } catch (error) {
    console.error('Error publishing content:', error)
    alert('Failed to publish content. Please try again.')
  } finally {
    isPublishing.value = false
  }
}

// Process tags input
function processTags() {
  if (!tagsInput.value) return
  
  const tags = tagsInput.value.split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag && !contentData.tags.includes(tag))
  
  if (tags.length > 0) {
    contentData.tags.push(...tags)
    tagsInput.value = ''
  }
}

function removeTag(index) {
  contentData.tags.splice(index, 1)
}

// Watch for tagsInput changes
watch(tagsInput, (newValue) => {
  if (newValue.endsWith(',')) {
    processTags()
  }
})

// Initialize
onMounted(async () => {
  // Initialize streaming store
  if (!streamingStore.isInitialized) {
    try {
      await streamingStore.initialize()
    } catch (error) {
      console.error('Failed to initialize streaming store:', error)
    }
  }
})
</script>

<style scoped>
.content-create {
  padding-top: 1rem;
}

/* Progress Indicator */
.creation-progress .progress {
  background-color: #e9ecef;
}

.step {
  text-align: center;
  width: 80px;
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #e9ecef;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-weight: bold;
}

.step.active .step-number {
  background-color: #6366f1;
  color: white;
}

.step.completed .step-number {
  background-color: #10b981;
  color: white;
}

.step-label {
  font-size: 0.8rem;
  margin-top: 0.25rem;
  color: #6c757d;
}

.step.active .step-label {
  color: #212529;
  font-weight: 500;
}

/* Upload Area */
.upload-placeholder {
  transition: all 0.2s ease;
  background-color: #f8f9fa;
}

.upload-placeholder.dragover {
  background-color: #e9ecef;
  border-color: #6366f1 !important;
}

.border-dashed {
  border-style: dashed !important;
  border-width: 2px !important;
}

/* Preset Buttons */
.preset-btn {
  border-width: 1px;
  position: relative;
  padding: 0.75rem 1rem;
}

/* Media Queries */
@media (max-width: 576px) {
  .step {
    width: 60px;
  }
  
  .step-label {
    font-size: 0.7rem;
  }
}
</style>

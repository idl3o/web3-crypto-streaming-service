<template>
  <div class="content-view" :class="theme">
    <div class="content-header">
      <div class="header-left">
        <h1>Content Management</h1>
        <p class="subtitle">Manage and curate your streaming content</p>
      </div>

      <div class="header-right">
        <button class="new-content-btn" @click="openNewContentDialog">
          <i class="fas fa-plus-circle"></i> New Content
        </button>
      </div>
    </div>

    <div class="content-body">
      <div class="content-filters">
        <div class="filter-bar">
          <div class="protocol-filter">
            <button v-for="filter in protocolFilters" :key="filter.value"
              :class="['filter-btn', { active: currentFilter === filter.value }]"
              @click="filterByProtocol(filter.value)">
              <i :class="filter.icon"></i>
              {{ filter.label }}
            </button>
          </div>

          <!-- Unity Filter -->
          <div class="unity-filter">
            <button v-for="filter in unityFilters" :key="filter.value"
              :class="['unity-filter-btn', { active: currentUnityFilter === filter.value }]"
              @click="filterByUnity(filter.value)">
              <i :class="filter.icon"></i>
              {{ filter.label }}
            </button>
          </div>

          <!-- Chain Filter -->
          <div class="chain-filter">
            <button v-for="chain in chainFilters" :key="chain.value"
              :class="['chain-filter-btn', { active: currentChainFilter === chain.value }]"
              @click="filterByChain(chain.value)">
              <img v-if="chain.value !== 'all'" :src="getChainLogo(chain.value)" :alt="chain.label" class="chain-icon">
              <i v-else class="fas fa-globe"></i>
              {{ chain.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="content-list">
        <div v-if="errorMessage" class="error-notification">
          <i class="fas fa-exclamation-circle"></i>
          {{ errorMessage }}
          <button @click="errorMessage = ''" class="close-error">×</button>
        </div>

        <div v-if="successMessage" class="success-notification">
          <i class="fas fa-check-circle"></i>
          {{ successMessage }}
          <button @click="successMessage = ''" class="close-success">×</button>
        </div>

        <div v-if="isLoading" class="loading-indicator">
          <i class="fas fa-spinner fa-spin"></i> Loading content...
        </div>

        <div v-else-if="filteredContent.length === 0" class="no-content">
          <i class="fas fa-film"></i>
          <p>No content available</p>
        </div>

        <div v-else class="content-grid">
          <ContentCard v-for="content in filteredContent" :key="content.id" :content="content" @view="handleView"
            @fork="handleFork" @viewTestimonials="handleViewTestimonials" @viewDependencies="handleViewDependencies"
            @openPortPlanck="handleOpenPortPlanck" @invest="handleInvest" />
        </div>
      </div>
    </div>

    <ForkStreamDialog v-if="showForkDialog" :content="selectedContent" @close="showForkDialog = false"
      @create="createForkedStream" />

    <TestimonialDialog v-if="showTestimonialsDialog" :content="selectedContent" @close="showTestimonialsDialog = false"
      @addTestimonial="addTestimonial" />

    <DependencyUnityDialog v-if="showDependenciesDialog" :content="selectedContent" :allStreams="contentList"
      @close="showDependenciesDialog = false" @view="handleDependencyView"
      @syncDependencies="syncContentDependencies" />

    <TheaterModeViewer v-if="showTheaterMode" :content="selectedContent" @exit="exitTheaterMode" @fork="handleFork"
      @viewTestimonials="handleViewTestimonials" @viewDependencies="handleViewDependencies" />

    <PortPlanckBridge v-if="showPortPlanckDialog" :content="selectedContent" @close="showPortPlanckDialog = false"
      @bridgeComplete="handleBridgeComplete" />

    <!-- Investment Success Dialog -->
    <div class="modal-overlay" v-if="showInvestmentSuccess" @click.self="showInvestmentSuccess = false">
      <div class="investment-success-modal">
        <div class="success-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3>Investment Successful!</h3>
        <p>You've successfully invested {{ formatEth(lastInvestmentAmount) }} ETH in "{{ lastInvestedContent?.title }}"
        </p>
        <div class="success-actions">
          <button class="view-stream-btn" @click="viewInvestedContent">
            <i class="fas fa-play"></i> View Stream
          </button>
          <button class="close-btn" @click="closeInvestmentSuccess">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Repository Dashboard -->
    <repository-dashboard v-if="showRepoDashboard" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import ContentCard from '@/components/content/ContentCard.vue';
import ForkStreamDialog from '@/components/content/ForkStreamDialog.vue';
import TestimonialDialog from '@/components/content/TestimonialDialog.vue';
import DependencyUnityDialog from '@/components/content/DependencyUnityDialog.vue';
import TheaterModeViewer from '@/components/content/TheaterModeViewer.vue';
import PortPlanckBridge from '@/components/bridges/PortPlanckBridge.vue';
import InvestButton from '@/components/investment/InvestButton.vue';
import RepositoryDashboard from '@/components/repository/RepositoryDashboard.vue';

const showForkDialog = ref(false);
const showTestimonialsDialog = ref(false);
const showDependenciesDialog = ref(false);
const showTheaterMode = ref(false);
const showPortPlanckDialog = ref(false);
const selectedContent = ref(null);
const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(true);
const currentFilter = ref('all');
const currentUnityFilter = ref('all');
const currentChainFilter = ref('all');
const showRepoDashboard = ref(true);

const contentList = ref([]);

const protocolFilters = [
  { label: 'All Content', value: 'all', icon: 'fas fa-th-large' },
  { label: 'Standard', value: 'standard', icon: 'fas fa-play-circle' },
  { label: 'K80 Protocol', value: 'k80', icon: 'fas fa-shield-alt' }
];

const unityFilters = [
  { label: 'All', value: 'all', icon: 'fas fa-th-large' },
  { label: 'Unified', value: 'synced', icon: 'fas fa-check-circle' },
  { label: 'Diverged', value: 'diverged', icon: 'fas fa-code-branch' },
  { label: 'Outdated', value: 'outdated', icon: 'fas fa-exclamation-triangle' }
];

const chainFilters = [
  { label: 'All Chains', value: 'all' },
  { label: 'Ethereum', value: 'ethereum' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Avalanche', value: 'avalanche' },
  { label: 'BSC', value: 'bsc' },
];

const filteredContent = computed(() => {
  let filtered = contentList.value;

  // First filter by protocol
  if (currentFilter.value !== 'all') {
    filtered = filtered.filter(content => content.protocol === currentFilter.value);
  }

  // Then filter by unity status
  if (currentUnityFilter.value !== 'all') {
    filtered = filtered.filter(content => {
      if (!content.unityStatus && currentUnityFilter.value === 'unknown') return true;
      return content.unityStatus === currentUnityFilter.value;
    });
  }

  // Filter by chain
  if (currentChainFilter.value !== 'all') {
    filtered = filtered.filter(content =>
      content.chain === currentChainFilter.value
    );
  }

  return filtered;
});

// Simulate fetching content data
onMounted(async () => {
  try {
    isLoading.value = true;
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    contentList.value = [
      {
        id: 1,
        title: 'Introduction to Blockchain',
        creator: 'CryptoExpert',
        description: 'Learn the basics of blockchain technology and its applications.',
        thumbnail: 'https://via.placeholder.com/300x180?text=Blockchain',
        paymentRate: 0.002,
        views: 1250,
        protocol: 'standard',
        unityStatus: 'synced',
        chain: 'ethereum',
        dependencies: [
          { id: 'eth-v1', name: 'Ethereum API', version: '1.2.0', type: 'API', status: 'synced' },
          { id: 'cryptolib', name: 'CryptoLib', version: '2.1.0', type: 'Library', status: 'synced' }
        ],
        testimonials: [
          {
            id: '101',
            author: 'Alex Johnson',
            rating: 5,
            text: 'This is the best introduction to blockchain I\'ve found! Clear explanations and great examples.',
            date: '2023-05-15T14:22:30Z'
          },
          {
            id: '102',
            author: 'Sam Chen',
            rating: 4,
            text: 'Very informative content. Would recommend to anyone starting with blockchain.',
            date: '2023-06-22T09:15:45Z'
          }
        ]
      },
      {
        id: 2,
        title: 'Smart Contract Development',
        creator: 'EthDev',
        description: 'A comprehensive guide to developing smart contracts on Ethereum.',
        thumbnail: 'https://via.placeholder.com/300x180?text=Smart+Contracts',
        paymentRate: 0.005,
        views: 870,
        protocol: 'standard',
        unityStatus: 'outdated',
        chain: 'ethereum',
        dependencies: [
          { id: 'eth-v1', name: 'Ethereum API', version: '1.1.0', type: 'API', status: 'outdated' },
          { id: 'solidity', name: 'Solidity', version: '0.8.0', type: 'Library', status: 'synced' }
        ],
        testimonials: [
          {
            id: '201',
            author: 'Maria Garcia',
            rating: 5,
            text: 'Finally understood how to write secure smart contracts. The examples are practical and well-explained.',
            date: '2023-07-03T16:40:12Z'
          }
        ]
      },
      {
        id: 3,
        title: 'Secure Decentralized Applications',
        creator: 'Web3Security',
        description: 'Building secure and resilient decentralized applications with advanced protocols.',
        thumbnail: 'https://via.placeholder.com/300x180?text=DApps+Security',
        paymentRate: 0.008,
        views: 650,
        protocol: 'k80',
        unityStatus: 'synced',
        chain: 'polygon',
        k80Metrics: {
          nodes: 24,
          bandwidth: 750,
          uptime: 99.98
        },
        k80Settings: {
          nodeCount: 24,
          encryptionLevel: 'enhanced',
          enablePeerAcceleration: true
        },
        dependencies: [
          { id: 'k80-protocol', name: 'K80 Protocol', version: '1.0.0', type: 'Protocol', status: 'synced' },
          { id: 'security-suite', name: 'Web3 Security Suite', version: '3.2.1', type: 'Library', status: 'synced' }
        ],
        testimonials: [
          {
            id: '301',
            author: 'David Kim',
            rating: 5,
            text: 'The K80 protocol made content streaming extremely smooth. The security insights are invaluable.',
            date: '2023-08-11T10:28:55Z'
          },
          {
            id: '302',
            author: 'Lisa Wong',
            rating: 5,
            text: 'Best practices for DApp security explained in detail. A must-watch for every Web3 developer.',
            date: '2023-08-15T17:12:30Z'
          },
          {
            id: '303',
            author: 'James Peterson',
            rating: 4,
            text: 'High-quality content, especially the sections on vulnerability prevention.',
            date: '2023-09-01T14:05:22Z'
          }
        ]
      },
      {
        id: 4,
        title: 'Advanced Cryptography',
        creator: 'CryptoMaster',
        description: 'Deep dive into cryptographic principles that power blockchain security.',
        thumbnail: 'https://via.placeholder.com/300x180?text=Cryptography',
        paymentRate: 0.01,
        views: 420,
        protocol: 'k80',
        unityStatus: 'diverged',
        chain: 'avalanche',
        k80Metrics: {
          nodes: 15,
          bandwidth: 480,
          uptime: 99.95
        },
        k80Settings: {
          nodeCount: 15,
          encryptionLevel: 'maximum',
          enablePeerAcceleration: true
        },
        forkedFrom: 3,
        parentStatus: 'diverged',
        dependencies: [
          { id: 'k80-protocol', name: 'K80 Protocol', version: '1.0.0', type: 'Protocol', status: 'synced' },
          { id: 'crypto-primitives', name: 'Crypto Primitives', version: '2.0.0', type: 'Library', status: 'diverged' }
        ],
        testimonials: []
      },
      {
        id: 5,
        title: 'DeFi Yield Strategies',
        creator: 'YieldHunter',
        description: 'Exploring advanced strategies for maximizing yields in DeFi protocols.',
        thumbnail: 'https://via.placeholder.com/300x180?text=DeFi+Yields',
        paymentRate: 0.007,
        views: 580,
        protocol: 'standard',
        unityStatus: 'synced',
        chain: 'bsc',
        dependencies: [],
        testimonials: []
      }
    ];
  } catch (error) {
    console.error('Error fetching content:', error);
    errorMessage.value = 'Failed to load content. Please try again later.';
  } finally {
    isLoading.value = false;
  }
});

function filterByProtocol(protocol) {
  currentFilter.value = protocol;
}

function filterByUnity(unityStatus) {
  currentUnityFilter.value = unityStatus;
}

function filterByChain(chain) {
  currentChainFilter.value = chain;
}

function getChainLogo(chainId) {
  return `https://via.placeholder.com/24x24/3498db/ffffff?text=${chainId[0].toUpperCase()}`;
}

function handleView(content) {
  try {
    console.log('Viewing content:', content);

    // Enter theater mode
    selectedContent.value = content;
    showTheaterMode.value = true;

    // Handle K80 protocol content differently
    if (content.protocol === 'k80') {
      console.log('Initializing K80 secure streaming protocol');
      // In a real implementation, this would connect to the K80 distribution network
    }

  } catch (error) {
    console.error('Error viewing content:', error);
    errorMessage.value = 'Unable to view content. Please try again.';
  }
}

function exitTheaterMode() {
  showTheaterMode.value = false;
}

function handleFork(content) {
  try {
    // Validate content before showing dialog
    if (!content || !content.id) {
      errorMessage.value = 'Invalid content selected for forking.';
      return;
    }

    selectedContent.value = content;
    showForkDialog.value = true;
  } catch (error) {
    console.error('Error preparing to fork content:', error);
    errorMessage.value = 'Unable to fork content. Please try again.';
  }
}

function handleViewTestimonials(content) {
  try {
    selectedContent.value = content;
    showTestimonialsDialog.value = true;
  } catch (error) {
    console.error('Error viewing testimonials:', error);
    errorMessage.value = 'Unable to display testimonials. Please try again.';
  }
}

function handleViewDependencies(content) {
  try {
    selectedContent.value = content;
    showDependenciesDialog.value = true;
  } catch (error) {
    console.error('Error viewing dependencies:', error);
    errorMessage.value = 'Unable to display dependencies. Please try again.';
  }
}

function handleDependencyView(dependency) {
  // Find the dependency in the content list
  const dependencyContent = contentList.value.find(c => c.id === dependency.id);

  if (dependencyContent) {
    handleView(dependencyContent);
  } else {
    errorMessage.value = `Content with ID ${dependency.id} not found.`;
  }

  // Close the dependency dialog
  showDependenciesDialog.value = false;
}

async function addTestimonial(testimonial) {
  try {
    // Find the content in the list
    const contentIndex = contentList.value.findIndex(c => c.id === selectedContent.value.id);
    if (contentIndex === -1) {
      throw new Error('Content not found');
    }

    // Initialize testimonials array if it doesn't exist
    if (!contentList.value[contentIndex].testimonials) {
      contentList.value[contentIndex].testimonials = [];
    }

    // Add the testimonial
    contentList.value[contentIndex].testimonials.push(testimonial);

    // Update selected content reference
    selectedContent.value = contentList.value[contentIndex];

    successMessage.value = 'Your testimonial has been added. Thank you for your feedback!';
  } catch (error) {
    console.error('Error adding testimonial:', error);
    errorMessage.value = 'Failed to add testimonial. Please try again.';
  }
}

async function syncContentDependencies(content) {
  try {
    // Find the content in the list
    const contentIndex = contentList.value.findIndex(c => c.id === content.id);
    if (contentIndex === -1) {
      throw new Error('Content not found');
    }

    // Update dependencies
    if (content.dependencies) {
      content.dependencies.forEach(dep => {
        if (dep.status === 'outdated') {
          dep.status = 'synced';
          // Simulate version update
          const currentVersion = dep.version.split('.');
          currentVersion[2] = parseInt(currentVersion[2]) + 1;
          dep.version = currentVersion.join('.');
        }
      });
    }

    // Update parent status if needed
    if (content.parentStatus === 'outdated') {
      content.parentStatus = 'synced';
    }

    // Update overall unity status
    content.unityStatus = 'synced';

    // Update in content list
    contentList.value[contentIndex] = { ...content };

    // Update selected content reference
    selectedContent.value = contentList.value[contentIndex];

    successMessage.value = 'Dependencies synchronized successfully!';
  } catch (error) {
    console.error('Error syncing dependencies:', error);
    errorMessage.value = 'Failed to synchronize dependencies. Please try again.';
  }
}

async function createForkedStream(forkedStream) {
  try {
    console.log('Creating forked stream:', forkedStream);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Add the new forked stream to the list with a new ID
    const newStream = {
      ...forkedStream,
      id: Date.now(), // Generate a unique ID
      views: 0,       // Reset views for the new stream
      testimonials: [], // Reset testimonials for the new stream
      unityStatus: 'synced',
      parentStatus: 'synced'
    };

    // Special handling for K80 protocol content
    if (newStream.protocol === 'k80') {
      successMessage.value = `Successfully forked "${forkedStream.title}" with K80 protocol`;
    } else {
      successMessage.value = `Successfully forked "${forkedStream.title}"`;
    }

    contentList.value.unshift(newStream);
    showForkDialog.value = false;
  } catch (error) {
    console.error('Error creating forked stream:', error);
    errorMessage.value = 'Failed to create forked stream. Please try again.';
  }
}

function handleOpenPortPlanck(content) {
  selectedContent.value = content;
  showPortPlanckDialog.value = true;
}

function handleBridgeComplete(event) {
  const { content, destinationChain } = event;

  // Create a new content instance on the destination chain
  const bridgedContent = {
    ...content,
    id: Date.now(), // Generate unique ID for the bridged content
    chain: destinationChain,
    views: 0, // Reset views for the bridged content
    bridgedFrom: content.id,
    bridgedAt: new Date().toISOString()
  };

  // Add the bridged content to our list
  contentList.value.push(bridgedContent);

  // Show success message
  successMessage.value = `Successfully bridged "${content.title}" to ${destinationChain}`;
}

const showInvestmentSuccess = ref(false);
const lastInvestmentAmount = ref(0);
const lastInvestedContent = ref(null);
const userWalletBalance = ref(2.5); // Mock wallet balance

function handleInvest(investData) {
  try {
    console.log('Investing in content:', investData.content, 'amount:', investData.amount);

    // Validate investment amount against wallet balance
    if (investData.amount > userWalletBalance.value) {
      errorMessage.value = 'Insufficient wallet balance';
      return;
    }

    // In a real implementation, this would call a blockchain transaction
    // For demo purposes, we'll just update the mock wallet
    userWalletBalance.value -= investData.amount;

    // Store investment details for success dialog
    lastInvestmentAmount.value = investData.amount;
    lastInvestedContent.value = investData.content;
    showInvestmentSuccess.value = true;

    // Show success message
    successMessage.value = `Successfully invested ${formatEth(investData.amount)} ETH in "${investData.content.title}"`;

  } catch (error) {
    console.error('Error processing investment:', error);
    errorMessage.value = 'Failed to process investment. Please try again.';
  }
}

function viewInvestedContent() {
  if (lastInvestedContent.value) {
    handleView(lastInvestedContent.value);
  }
  showInvestmentSuccess.value = false;
}

function closeInvestmentSuccess() {
  showInvestmentSuccess.value = false;
}

function formatEth(value) {
  if (value === undefined || value === null) return '0.000';
  return value.toFixed(3);
}
</script>

<style scoped>
.content-view {
  padding: 20px;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.error-notification,
.success-notification {
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-notification {
  background-color: #ffebee;
  color: #d32f2f;
}

.success-notification {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.close-error,
.close-success {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.7;
}

.close-error:hover,
.close-success:hover {
  opacity: 1;
}

.loading-indicator {
  text-align: center;
  padding: 40px 0;
  color: #666;
  font-size: 18px;
}

.no-content {
  text-align: center;
  padding: 60px 0;
  color: #888;
}

.no-content i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.protocol-filter {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background-color: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.filter-btn:hover {
  background-color: #e0e0e0;
}

.filter-btn.active {
  background-color: #1976d2;
  color: white;
  border-color: #1976d2;
}

/* Roman theme overrides */
.roman-theme .filter-btn {
  background-color: #fcf8f3;
  border-color: #d5c3aa;
}

.roman-theme .filter-btn:hover {
  background-color: #f0e6d2;
}

.roman-theme .filter-btn.active {
  background-color: #8B4513;
  border-color: #8B4513;
  color: white;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.unity-filter {
  display: flex;
  gap: 10px;
}

.unity-filter-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background-color: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.unity-filter-btn:hover {
  background-color: #e0e0e0;
}

.unity-filter-btn.active {
  color: white;
}

.unity-filter-btn.active:nth-child(1) {
  background-color: #1976d2;
  border-color: #1976d2;
}

.unity-filter-btn.active:nth-child(2) {
  background-color: #2ecc71;
  border-color: #2ecc71;
}

.unity-filter-btn.active:nth-child(3) {
  background-color: #3498db;
  border-color: #3498db;
}

.unity-filter-btn.active:nth-child(4) {
  background-color: #f39c12;
  border-color: #f39c12;
}

/* Roman theme overrides */
.roman-theme .unity-filter-btn {
  background-color: #fcf8f3;
  border-color: #d5c3aa;
}

.roman-theme .unity-filter-btn:hover {
  background-color: #f0e6d2;
}

.roman-theme .unity-filter-btn.active:nth-child(1) {
  background-color: #8B4513;
  border-color: #8B4513;
}

.roman-theme .unity-filter-btn.active:nth-child(2) {
  background-color: #8B4513;
  border-color: #8B4513;
}

.roman-theme .unity-filter-btn.active:nth-child(3) {
  background-color: #A0522D;
  border-color: #A0522D;
}

.roman-theme .unity-filter-btn.active:nth-child(4) {
  background-color: #CD853F;
  border-color: #CD853F;
}

.chain-filter {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chain-filter-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background-color: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.chain-filter-btn .chain-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.chain-filter-btn:hover {
  background-color: #e0e0e0;
}

.chain-filter-btn.active {
  background-color: #3498db;
  color: white;
  border-color: #3498db;
}

/* Roman theme overrides */
.roman-theme .chain-filter-btn {
  background-color: #fcf8f3;
  border-color: #d5c3aa;
}

.roman-theme .chain-filter-btn:hover {
  background-color: #f0e6d2;
}

.roman-theme .chain-filter-btn.active {
  background-color: #6B8E23;
  border-color: #6B8E23;
}

/* When theater mode is active, hide scrollbars on the body */
:global(body.theater-mode-active) {
  overflow: hidden;
}

.investment-success-modal {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  width: 400px;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.success-icon {
  font-size: 3rem;
  color: #4CAF50;
  margin-bottom: 15px;
}

.investment-success-modal h3 {
  margin: 0 0 15px 0;
  font-size: 1.4rem;
}

.investment-success-modal p {
  margin: 0 0 25px 0;
  font-size: 1rem;
  color: #666;
}

.success-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.view-stream-btn {
  padding: 10px 20px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-stream-btn:hover {
  background-color: #1565c0;
}

.close-btn {
  padding: 10px 20px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.close-btn:hover {
  background-color: #e0e0e0;
}

.roman-theme .success-icon {
  color: #8B4513;
}

.roman-theme .view-stream-btn {
  background-color: #8B4513;
}

.roman-theme .view-stream-btn:hover {
  background-color: #A0522D;
}
</style>

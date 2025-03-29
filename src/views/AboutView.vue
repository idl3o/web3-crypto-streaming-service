<template>
  <div class="about-page">
    <div class="hero-section">
      <div class="container">
        <h1>About Web3 Crypto Streaming Service</h1>
        <p class="lead">
          Building the decentralized future of content streaming on the blockchain
        </p>
      </div>
    </div>
    
    <div class="container py-5">
      <div class="row">
        <div class="col-lg-8 mx-auto">
          <div class="card border-0 shadow-sm mb-5">
            <div class="card-body p-4">
              <h2>Our Mission</h2>
              <p class="mb-4">
                Web3 Crypto Streaming Service is revolutionizing content streaming by leveraging 
                blockchain technology to create a decentralized, creator-owned ecosystem. 
                We believe in empowering creators with direct relationships with their audience, 
                free from centralized gatekeepers.
              </p>
              
              <h2>What We're Building</h2>
              <div class="mb-4">
                <h5>Decentralized Streaming Protocol</h5>
                <p>
                  Our protocol enables peer-to-peer content delivery with incentive structures that reward 
                  participants at all levels of the network.
                </p>
                
                <h5>Creator Economy</h5>
                <p>
                  We're building tools for creators to monetize their content directly through streaming 
                  payments, NFTs, and community tokens.
                </p>
                
                <h5>Community Governance</h5>
                <p>
                  Our platform is community-owned and governed, with token holders participating in key 
                  decisions and protocol upgrades.
                </p>
              </div>
              
              <h2>Technology Stack</h2>
              <p>
                Built on Ethereum and Polygon with Layer 2 scaling solutions, our platform combines 
                the security of blockchain with the performance needed for high-quality content streaming.
              </p>
              <ul class="tech-stack-list">
                <li><strong>Blockchain:</strong> Ethereum, Polygon</li>
                <li><strong>Storage:</strong> IPFS, Filecoin</li>
                <li><strong>Streaming:</strong> WebRTC, HLS</li>
                <li><strong>Frontend:</strong> Vue.js, Pinia, Bootstrap</li>
                <li><strong>Smart Contracts:</strong> Solidity, Hardhat</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Team Section -->
    <div class="bg-light py-5">
      <div class="container">
        <h2 class="text-center mb-5">Our Team</h2>
        <div class="row">
          <div class="col-md-3 col-sm-6 mb-4" v-for="member in team" :key="member.name">
            <div class="card border-0 shadow-sm h-100">
              <div class="team-member-image">
                <img :src="member.image || getDefaultAvatar(member.name)" :alt="member.name" class="card-img-top">
              </div>
              <div class="card-body text-center">
                <h5 class="card-title">{{ member.name }}</h5>
                <p class="card-text text-muted">{{ member.role }}</p>
                <div class="social-links">
                  <a v-for="link in member.socialLinks" :key="link.url" :href="link.url" target="_blank" rel="noopener" class="social-link">
                    <i :class="link.icon"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Credits Section -->
    <CreditsSection />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CreditsSection from '@/components/layout/CreditsSection.vue';

const team = ref([
  {
    name: 'idl30',
    role: 'Founder & Lead Developer',
    image: '/assets/images/team/idl30.jpg',
    socialLinks: [
      { icon: 'fab fa-github', url: 'https://github.com/idl30' },
      { icon: 'fab fa-twitter', url: 'https://twitter.com/idl30' },
      { icon: 'fab fa-linkedin', url: 'https://linkedin.com/in/idl30' }
    ]
  },
  {
    name: 'Riley Maxwell',
    role: 'Protocol Engineer',
    image: '/assets/images/team/riley.jpg',
    socialLinks: [
      { icon: 'fab fa-github', url: 'https://github.com/rileym' },
      { icon: 'fab fa-twitter', url: 'https://twitter.com/rileym' }
    ]
  },
  {
    name: 'CryptoSage',
    role: 'Tokenomics Expert',
    socialLinks: [
      { icon: 'fab fa-github', url: '#' },
      { icon: 'fab fa-twitter', url: '#' }
    ]
  },
  {
    name: 'Web3Visionary',
    role: 'UX Designer',
    socialLinks: [
      { icon: 'fab fa-github', url: '#' },
      { icon: 'fab fa-behance', url: '#' }
    ]
  },
  {
    name: 'StreamMaster',
    role: 'Streaming Expert',
    socialLinks: [
      { icon: 'fab fa-github', url: '#' },
      { icon: 'fab fa-twitter', url: '#' }
    ]
  }
]);

function getDefaultAvatar(name) {
  return `https://avatars.dicebear.com/api/identicon/${name}.svg`;
}
</script>

<style scoped>
.hero-section {
  background: var(--gradient-primary);
  color: white;
  padding: 5rem 0;
  text-align: center;
}

.hero-section h1 {
  color: white;
  margin-bottom: 1.5rem;
  font-size: 3rem;
}

.hero-section .lead {
  font-size: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  opacity: 0.9;
}

.tech-stack-list {
  columns: 2;
  list-style-type: none;
  padding-left: 0;
}

.tech-stack-list li {
  margin-bottom: 0.75rem;
  position: relative;
  padding-left: 1.5rem;
}

.tech-stack-list li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--primary);
}

.team-member-image {
  height: 220px;
  overflow: hidden;
}

.team-member-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--primary);
  transition: all 0.2s ease;
}

.social-link:hover {
  background-color: var(--primary);
  color: white;
  transform: translateY(-3px);
}

@media (max-width: 768px) {
  .hero-section {
    padding: 3rem 0;
  }
  
  .hero-section h1 {
    font-size: 2.5rem;
  }
  
  .hero-section .lead {
    font-size: 1.2rem;
  }
  
  .tech-stack-list {
    columns: 1;
  }
}
</style>

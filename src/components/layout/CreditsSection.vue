<template>
  <div class="credits-section">
    <div class="container">
      <h2 class="credits-title">Credits & Accreditation</h2>
      
      <div class="credits-grid">
        <div class="credits-category">
          <h3>Core Team</h3>
          <div class="team-members">
            <div v-for="member in coreTeam" :key="member.name" class="team-member">
              <div class="avatar">
                <img :src="member.avatar || getDefaultAvatar(member.name)" :alt="member.name">
              </div>
              <div class="member-info">
                <div class="member-name">{{ member.name }}</div>
                <div class="member-role">{{ member.role }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="credits-category">
          <h3>Technologies</h3>
          <div class="tech-list">
            <div v-for="category in technologies" :key="category.title" class="tech-category">
              <h4>{{ category.title }}</h4>
              <ul>
                <li v-for="tech in category.items" :key="tech.name">
                  <a :href="tech.url" target="_blank" rel="noopener">{{ tech.name }}</a>
                  <span v-if="tech.license" class="license-tag">{{ tech.license }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="credits-category">
          <h3>Contributors</h3>
          <div class="contributors-list">
            <a v-for="contributor in contributors" 
               :key="contributor.name" 
               :href="contributor.url || '#'" 
               :title="`${contributor.name}: ${contributor.contribution}`"
               class="contributor-badge"
               :style="{ backgroundColor: getColorFromString(contributor.name) }">
              {{ getInitials(contributor.name) }}
            </a>
          </div>
        </div>
      </div>
      
      <div class="license-info">
        <h3>License Information</h3>
        <p>
          Web3 Crypto Streaming Service is licensed under the 
          <router-link to="/license">Web3 Crypto Streaming Service License (W3CS-L)</router-link>.
        </p>
        <p>
          For more detailed attribution and credits information, please review our 
          <a href="https://github.com/web3-crypto-streaming-service/web3-crypto-streaming-service/blob/main/ATTRIBUTION.md" 
             target="_blank" rel="noopener">
            ATTRIBUTION.md
          </a> file.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const coreTeam = ref([
  { 
    name: 'idl30', 
    role: 'Founder & Lead Developer', 
    avatar: '/assets/images/team/idl30.jpg' 
  },
  { 
    name: 'Riley Maxwell',
    role: 'Protocol Engineer',
    avatar: '/assets/images/team/riley.jpg'
  },
  { 
    name: 'CryptoSage', 
    role: 'Tokenomics Expert' 
  },
  { 
    name: 'Web3Visionary', 
    role: 'UX Designer' 
  },
  { 
    name: 'StreamMaster', 
    role: 'Streaming Expert' 
  }
]);

const technologies = ref([
  {
    title: 'Blockchain',
    items: [
      { name: 'Ethereum', url: 'https://ethereum.org', license: 'LGPL' },
      { name: 'Polygon', url: 'https://polygon.technology', license: 'MIT' },
      { name: 'ethers.js', url: 'https://docs.ethers.org', license: 'MIT' },
      { name: 'Hardhat', url: 'https://hardhat.org', license: 'MIT' }
    ]
  },
  {
    title: 'Frontend',
    items: [
      { name: 'Vue.js', url: 'https://vuejs.org', license: 'MIT' },
      { name: 'Pinia', url: 'https://pinia.esm.dev', license: 'MIT' },
      { name: 'Bootstrap', url: 'https://getbootstrap.com', license: 'MIT' }
    ]
  },
  {
    title: 'Streaming',
    items: [
      { name: 'IPFS', url: 'https://ipfs.io', license: 'MIT/Apache-2.0' },
      { name: 'libp2p', url: 'https://libp2p.io', license: 'MIT' },
      { name: 'FFmpeg', url: 'https://ffmpeg.org', license: 'LGPL/GPL' },
      { name: 'HLS.js', url: 'https://github.com/video-dev/hls.js', license: 'Apache-2.0' }
    ]
  }
]);

const contributors = ref([
  { name: 'Guyed Thompson', contribution: 'Front-end development & UI optimization', url: 'https://github.com/guyedt' },
  { name: 'David Chen', contribution: 'DevOps & infrastructure', url: 'https://github.com/davidchen' },
  { name: 'DeFiDev', contribution: 'Smart contract audits and optimization', url: 'https://github.com/defidev' },
  { name: 'IPFSNinja', contribution: 'Decentralized storage integration', url: 'https://github.com/ipfsninja' },
  { name: 'ChainAnalyst', contribution: 'Data analytics and metrics', url: 'https://github.com/chainanalyst' },
  { name: 'P2PGuru', contribution: 'Peer-to-peer networking improvements', url: 'https://github.com/p2pguru' },
  { name: 'CryptoContributor', contribution: 'Documentation improvements' },
  { name: 'BlockchainBuilder', contribution: 'Test coverage' }
]);

// Utilities
function getInitials(name) {
  return name.split(/\s+/).map(word => word[0]).join('').substring(0, 2).toUpperCase();
}

function getDefaultAvatar(name) {
  return `https://avatars.dicebear.com/api/identicon/${name}.svg`;
}

function getColorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 45%)`;
}
</script>

<style scoped>
.credits-section {
  padding: 3rem 0;
  color: var(--light);
  background-color: var(--dark);
}

.credits-title {
  text-align: center;
  margin-bottom: 3rem;
  font-family: var(--font-heading);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.credits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.credits-category {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.credits-category h3 {
  margin-bottom: 1.5rem;
  color: var(--secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
  position: relative;
}

.credits-category h3:after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 50px;
  height: 2px;
  background: var(--gradient-secondary);
}

.team-members {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.team-member {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: var(--border-radius);
  background-color: rgba(255, 255, 255, 0.03);
  transition: background-color 0.3s ease;
}

.team-member:hover {
  background-color: rgba(255, 255, 255, 0.07);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 1rem;
  background: var(--gradient-primary);
  padding: 2px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.2);
}

.member-name {
  font-weight: 600;
}

.member-role {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 0.25rem;
}

.tech-category {
  margin-bottom: 1rem;
}

.tech-category h4 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--light);
}

.tech-category ul {
  padding-left: 1.5rem;
}

.tech-category li {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.tech-category a {
  color: var(--secondary);
  text-decoration: none;
}

.tech-category a:hover {
  text-decoration: underline;
}

.license-tag {
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-left: 0.5rem;
  vertical-align: middle;
  opacity: 0.8;
}

.contributors-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.contributor-badge {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  transition: transform 0.2s ease;
}

.contributor-badge:hover {
  transform: scale(1.1);
}

.license-info {
  text-align: center;
  margin-top: 3rem;
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius);
}

.license-info h3 {
  margin-bottom: 1rem;
  color: var(--secondary);
}

.license-info p {
  margin-bottom: 0.5rem;
  opacity: 0.9;
}

.license-info a {
  color: var(--secondary);
  text-decoration: none;
}

.license-info a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .credits-grid {
    grid-template-columns: 1fr;
  }
}
</style>

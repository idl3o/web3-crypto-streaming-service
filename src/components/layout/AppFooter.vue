<template>
  <footer class="app-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-logo">
          <img src="/logo.svg" alt="Web3 Streaming" height="40">
        </div>
        
        <div class="footer-nav">
          <div class="footer-section">
            <h4>Platform</h4>
            <ul>
              <li><router-link to="/">Home</router-link></li>
              <li><router-link to="/browse">Browse</router-link></li>
              <li><router-link to="/create">Create</router-link></li>
              <li><router-link to="/live">Live</router-link></li>
            </ul>
          </div>
          
          <div class="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><router-link to="/docs">Documentation</router-link></li>
              <li><router-link to="/tutorials">Tutorials</router-link></li>
              <li><router-link to="/faq">FAQ</router-link></li>
              <li><a href="https://github.com/web3-streaming" target="_blank">GitHub</a></li>
            </ul>
          </div>
          
          <div class="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><router-link to="/terms">Terms of Service</router-link></li>
              <li><router-link to="/privacy">Privacy Policy</router-link></li>
              <li><router-link to="/license">License</router-link></li>
              <li><router-link to="/attribution">Attribution</router-link></li>
            </ul>
          </div>
          
          <div class="footer-section">
            <h4>Connect</h4>
            <ul>
              <li><a href="https://twitter.com/web3streaming" target="_blank">Twitter</a></li>
              <li><a href="https://discord.gg/web3streaming" target="_blank">Discord</a></li>
              <li><a href="https://t.me/web3streaming" target="_blank">Telegram</a></li>
              <li><a href="mailto:contact@web3streaming.example">Email</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="footer-bottom">
        <div class="copyright">
          &copy; {{ currentYear }} Web3 Crypto Streaming Service. All rights reserved.
        </div>
        
        <div class="attributions">
          <span>Powered by </span>
          <a href="https://ethereum.org" target="_blank" rel="noopener">Ethereum</a>
          <span> & </span>
          <a href="https://polygon.technology" target="_blank" rel="noopener">Polygon</a>
          <span> | Built with </span>
          <a href="https://vuejs.org" target="_blank" rel="noopener">Vue.js</a>
          <span> | </span>
          <router-link to="/attributions">View All Credits</router-link>
        </div>
      </div>
      
      <div class="accreditation">
        <div class="accreditation-badges">
          <div class="badge">
            <img src="/assets/badges/w3cs-certified.svg" alt="W3CS Certified">
            <span>Certified</span>
          </div>
          <div class="badge">
            <img src="/assets/badges/ipfs-powered.svg" alt="IPFS Powered">
            <span>IPFS</span>
          </div>
          <div class="badge">
            <img src="/assets/badges/web3-compatible.svg" alt="Web3 Compatible">
            <span>Web3</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>

<style scoped>
.app-footer {
  background-color: var(--dark-color);
  color: var(--light-color);
  padding-top: 3rem;
  margin-top: 3rem;
}

.footer-top {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-logo {
  flex: 0 0 100%;
  margin-bottom: 1rem;
}

.footer-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 2rem;
  flex: 1;
}

.footer-section h4 {
  color: white;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.footer-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-section ul li {
  margin-bottom: 0.5rem;
}

.footer-section a {
  color: var(--light-color);
  opacity: 0.8;
  transition: opacity 0.2s ease;
  text-decoration: none;
}

.footer-section a:hover {
  opacity: 1;
  color: var(--secondary);
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 2rem;
  padding-bottom: 2rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.copyright {
  opacity: 0.7;
  font-size: 0.9rem;
}

.attributions {
  font-size: 0.9rem;
  opacity: 0.7;
}

.attributions a {
  color: var(--secondary);
  text-decoration: none;
}

.attributions a:hover {
  text-decoration: underline;
}

.accreditation {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  text-align: center;
}

.accreditation-badges {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.badge img {
  height: 32px;
  width: auto;
}

.badge span {
  font-size: 0.75rem;
  opacity: 0.6;
}

@media (max-width: 768px) {
  .footer-nav {
    flex-direction: column;
    gap: 2rem;
  }
  
  .footer-bottom {
    flex-direction: column;
    text-align: center;
  }
  
  .accreditation-badges {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>

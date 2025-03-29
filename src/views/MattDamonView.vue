<template>
  <div class="matt-damon-view">
    <div class="page-header">
      <h1>Matt Damon: Fortune Favors the Brave</h1>
      <p class="subtitle">Join the campaign and receive exclusive cryptocurrency rewards</p>
    </div>
    
    <div class="campaign-container">
      <MattDamonPromotion
        @participate="handleParticipation"
        @learn-more="handleLearnMore"
      />
    </div>
    
    <div class="page-sections">
      <div class="campaign-details section">
        <h2 class="section-title"><i class="fas fa-rocket"></i> Campaign Details</h2>
        <div class="section-content">
          <div class="timeline">
            <h3>Campaign Timeline</h3>
            <div class="time-blocks">
              <div class="time-block">
                <div class="time-point active">
                  <i class="fas fa-flag"></i>
                </div>
                <div class="time-content">
                  <h4>Campaign Launch</h4>
                  <p>January 15, 2023</p>
                  <p>Initial token distribution and reward structure announcement</p>
                </div>
              </div>
              
              <div class="time-block">
                <div class="time-point active">
                  <i class="fas fa-chart-line"></i>
                </div>
                <div class="time-content">
                  <h4>First Milestone</h4>
                  <p>April 10, 2023</p>
                  <p>NFT collection release and bonus token distribution</p>
                </div>
              </div>
              
              <div class="time-block">
                <div class="time-point">
                  <i class="fas fa-gift"></i>
                </div>
                <div class="time-content">
                  <h4>Second Milestone</h4>
                  <p>August 5, 2023</p>
                  <p>Community rewards distribution and new feature access</p>
                </div>
              </div>
              
              <div class="time-block">
                <div class="time-point">
                  <i class="fas fa-trophy"></i>
                </div>
                <div class="time-content">
                  <h4>Final Milestone</h4>
                  <p>December 31, 2023</p>
                  <p>Grand prize drawing and campaign conclusion</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="benefits">
            <h3>Why Participate?</h3>
            <div class="benefits-grid">
              <div class="benefit-card">
                <div class="benefit-icon"><i class="fas fa-coins"></i></div>
                <h4>Exclusive Tokens</h4>
                <p>Receive FORT and BRAVE tokens only available through campaign participation</p>
              </div>
              
              <div class="benefit-card">
                <div class="benefit-icon"><i class="fas fa-palette"></i></div>
                <h4>Limited NFTs</h4>
                <p>Collect rare NFTs featuring historical moments representing bravery</p>
              </div>
              
              <div class="benefit-card">
                <div class="benefit-icon"><i class="fas fa-unlock"></i></div>
                <h4>Early Access</h4>
                <p>Get priority access to new platform features before general release</p>
              </div>
              
              <div class="benefit-card">
                <div class="benefit-icon"><i class="fas fa-percentage"></i></div>
                <h4>Bonus Rewards</h4>
                <p>Earn 25% more tokens on all crypto transactions during the campaign</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="about-matt section">
        <h2 class="section-title"><i class="fas fa-user"></i> About Matt Damon</h2>
        <div class="section-content">
          <div class="celebrity-profile">
            <div class="profile-image">
              <img src="https://via.placeholder.com/300x350?text=Matt+Damon" alt="Matt Damon Profile" />
            </div>
            
            <div class="profile-details">
              <h3>Matt Damon</h3>
              <div class="profile-subtitle">Academy Award Winner & Crypto Ambassador</div>
              
              <p>
                Matt Damon is an Academy Award-winning actor, producer, and screenwriter who has become a prominent
                voice in the cryptocurrency space. Known for his roles in Good Will Hunting, The Martian, and the
                Bourne series, Damon has leveraged his global influence to promote blockchain technology adoption.
              </p>
              
              <p>
                In 2021, Damon partnered with Crypto.com for their "Fortune Favors the Brave" campaign, which became 
                one of the most recognizable cryptocurrency advertisements worldwide. His involvement in the space
                has helped bring mainstream attention to digital assets and blockchain technology.
              </p>
              
              <div class="crypto-involvement">
                <h4>Crypto Involvement</h4>
                <ul>
                  <li>Global ambassador for cryptocurrency adoption</li>
                  <li>Supporter of blockchain-based charity initiatives</li>
                  <li>Early investor in several blockchain projects</li>
                  <li>Advocate for sustainable blockchain solutions</li>
                </ul>
              </div>
              
              <div class="notable-quote">
                <i class="fas fa-quote-left"></i>
                <blockquote>
                  History is filled with moments where the brave made a commitment to discovery and innovation.
                  Cryptocurrency represents that next frontier.
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="testimonials section">
        <h2 class="section-title"><i class="fas fa-comments"></i> Participant Testimonials</h2>
        <div class="section-content">
          <div class="testimonial-grid">
            <div class="testimonial-card">
              <div class="testimonial-content">
                <i class="fas fa-quote-left"></i>
                <p>Joining this campaign was the best decision I've made in my crypto journey. The bonus tokens gave me a significant head start!</p>
              </div>
              <div class="testimonial-author">
                <div class="author-avatar">JD</div>
                <div class="author-info">
                  <div class="author-name">Jack Dawson</div>
                  <div class="author-role">Early Participant</div>
                </div>
              </div>
            </div>
            
            <div class="testimonial-card">
              <div class="testimonial-content">
                <i class="fas fa-quote-left"></i>
                <p>The exclusive NFTs from this campaign have already doubled in value. Matt Damon's partnership brings real credibility to crypto.</p>
              </div>
              <div class="testimonial-author">
                <div class="author-avatar">SB</div>
                <div class="author-info">
                  <div class="author-name">Sarah Blake</div>
                  <div class="author-role">NFT Collector</div>
                </div>
              </div>
            </div>
            
            <div class="testimonial-card">
              <div class="testimonial-content">
                <i class="fas fa-quote-left"></i>
                <p>As a new crypto investor, this campaign provided educational resources that helped me understand the space better. Plus, the rewards are amazing!</p>
              </div>
              <div class="testimonial-author">
                <div class="author-avatar">MR</div>
                <div class="author-info">
                  <div class="author-name">Mike Reynolds</div>
                  <div class="author-role">New Investor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="faq section">
        <h2 class="section-title"><i class="fas fa-question-circle"></i> Frequently Asked Questions</h2>
        <div class="section-content">
          <div class="faq-list">
            <div class="faq-item" v-for="(item, index) in faqItems" :key="index" @click="toggleFaq(index)">
              <div class="faq-question">
                <span>{{ item.question }}</span>
                <i class="fas" :class="item.open ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              </div>
              <div class="faq-answer" v-if="item.open">
                <p>{{ item.answer }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="cta-section">
        <h2>Ready to Join Matt Damon's Campaign?</h2>
        <p>Fortune Favors the Brave. Participate now to receive exclusive rewards and benefits.</p>
        <button class="cta-button" @click="scrollToTop">
          <i class="fas fa-rocket"></i> Participate Now
        </button>
      </div>
    </div>
    
    <!-- Participation Confirmation Modal -->
    <div class="modal" v-if="showModal">
      <div class="modal-overlay" @click="closeModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button class="modal-close" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="participationSuccess">
            <div class="success-animation">
              <i class="fas fa-check-circle"></i>
            </div>
            <p>You've successfully joined the "Fortune Favors the Brave" campaign with Matt Damon!</p>
            <div class="rewards-info">
              <h4>Your Rewards</h4>
              <ul class="rewards-list">
                <li>
                  <i class="fas fa-coins"></i>
                  <span>25% Bonus on BRAVE token acquisitions</span>
                </li>
                <li>
                  <i class="fas fa-image"></i>
                  <span>Exclusive "Fortune" NFT will be delivered to your wallet</span>
                </li>
                <li>
                  <i class="fas fa-unlock"></i>
                  <span>Early access to new platform features</span>
                </li>
              </ul>
            </div>
          </div>
          <div v-else>
            <p>{{ modalMessage }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-button" @click="closeModal">
            {{ participationSuccess ? 'Continue Exploring' : 'Close' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import MattDamonPromotion from '@/components/celebrities/MattDamonPromotion.vue';
import * as BlockchainService from '@/services/BlockchainService';

// State
const showModal = ref(false);
const modalTitle = ref('');
const modalMessage = ref('');
const participationSuccess = ref(false);
const faqItems = ref([
  {
    question: 'What is the "Fortune Favors the Brave" campaign?',
    answer: 'The "Fortune Favors the Brave" campaign is a promotional initiative featuring Matt Damon that rewards users for participating in cryptocurrency activities on our platform. Participants receive exclusive tokens, NFTs, and early access to new features.',
    open: false
  },
  {
    question: 'How long does the campaign run?',
    answer: 'The campaign runs from January 15, 2023 to December 31, 2023, with several milestone events throughout the year where additional rewards are distributed.',
    open: false
  },
  {
    question: 'What rewards can I earn?',
    answer: 'Participants can earn BRAVE and FORTUNE tokens, exclusive NFTs from the "Fortune" collection, a 25% bonus on token acquisitions, and early access to new platform features.',
    open: false
  },
  {
    question: 'Do I need to own cryptocurrency to participate?',
    answer: 'Yes, you need a Web3 wallet to participate and receive the rewards. The campaign is designed for cryptocurrency enthusiasts and those looking to enter the space.',
    open: false
  },
  {
    question: 'How is Matt Damon involved in the campaign?',
    answer: 'Matt Damon serves as the celebrity ambassador for the campaign, promoting cryptocurrency adoption with the slogan "Fortune Favors the Brave." He appears in promotional materials and videos supporting the initiative.',
    open: false
  },
  {
    question: 'Can I participate if I live outside the United States?',
    answer: 'Yes, the campaign is open to international participants, subject to local regulations regarding cryptocurrency usage and promotional activities.',
    open: false
  }
]);

// Methods
function toggleFaq(index) {
  faqItems.value[index].open = !faqItems.value[index].open;
}

function handleParticipation(data) {
  console.log('Participation data:', data);
  
  if (data.result && data.result.success) {
    showSuccessModal();
  } else {
    showErrorModal('Error', 'There was an issue processing your participation. Please try again later.');
  }
}

function handleLearnMore(data) {
  console.log('Learn more about:', data);
  // Scroll to campaign details section
  const detailsSection = document.querySelector('.campaign-details');
  if (detailsSection) {
    detailsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function showSuccessModal() {
  modalTitle.value = 'Congratulations!';
  participationSuccess.value = true;
  showModal.value = true;
}

function showErrorModal(title, message) {
  modalTitle.value = title;
  modalMessage.value = message;
  participationSuccess.value = false;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Initialize
onMounted(() => {
  // Check if wallet is connected
  if (!BlockchainService.isConnected()) {
    console.log('Wallet not connected. Prompting user to connect for full experience.');
  }
});
</script>

<style scoped>
.matt-damon-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: #1e40af;
  font-weight: 800;
}

.page-header .subtitle {
  font-size: 1.2rem;
  color: #6b7280;
  max-width: 600px;
  margin: 0 auto;
}

.campaign-container {
  margin-bottom: 50px;
}

.page-sections {
  display: flex;
  flex-direction: column;
  gap: 50px;
}

.section {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.section-title {
  padding: 20px;
  margin: 0;
  background-color: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #1e40af;
}

.section-title i {
  color: #60a5fa;
}

.section-content {
  padding: 25px;
}

/* Timeline Styles */
.timeline h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.2rem;
  color: #4b5563;
}

.time-blocks {
  position: relative;
}

.time-blocks::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 0;
  width: 2px;
  height: 100%;
  background-color: #e5e7eb;
  z-index: 1;
}

.time-block {
  display: flex;
  margin-bottom: 30px;
  position: relative;
  z-index: 2;
}

.time-block:last-child {
  margin-bottom: 0;
}

.time-point {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  margin-right: 20px;
}

.time-point.active {
  background-color: #1e40af;
  color: white;
}

.time-content {
  flex: 1;
}

.time-content h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
}

.time-content p {
  margin: 0 0 5px 0;
  color: #6b7280;
}

.time-content p:first-of-type {
  color: #9ca3af;
  font-size: 0.9rem;
}

/* Benefits Styles */
.benefits {
  margin-top: 40px;
}

.benefits h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.2rem;
  color: #4b5563;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.benefit-card {
  background-color: #f9fafb;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  transition: transform 0.2s;
}

.benefit-card:hover {
  transform: translateY(-5px);
}

.benefit-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #dbeafe;
  color: #1e40af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin: 0 auto 15px;
}

.benefit-card h4 {
  margin: 0 0 10px 0;
  font-size: 1rem;
}

.benefit-card p {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

/* Celebrity Profile Styles */
.celebrity-profile {
  display: flex;
  gap: 30px;
}

.profile-image {
  flex: 0 0 300px;
}

.profile-image img {
  width: 100%;
  border-radius: 8px;
}

.profile-details {
  flex: 1;
}

.profile-details h3 {
  margin: 0 0 5px 0;
  font-size: 1.5rem;
  color: #1e40af;
}

.profile-subtitle {
  color: #6b7280;
  font-style: italic;
  margin-bottom: 20px;
}

.profile-details p {
  margin-bottom: 15px;
  line-height: 1.6;
}

.crypto-involvement {
  margin-top: 25px;
  background-color: #f3f4f6;
  padding: 15px;
  border-radius: 8px;
}

.crypto-involvement h4 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
}

.crypto-involvement ul {
  margin: 0;
  padding-left: 20px;
}

.crypto-involvement li {
  margin-bottom: 8px;
  color: #374151;
}

.notable-quote {
  margin-top: 25px;
  padding: 0 20px;
}

.notable-quote i {
  color: #9ca3af;
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.notable-quote blockquote {
  margin: 0;
  font-style: italic;
  font-size: 1.1rem;
  color: #4b5563;
  line-height: 1.6;
}

/* Testimonials Styles */
.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.testimonial-card {
  background-color: #f9fafb;
  padding: 20px;
  border-radius: 8px;
}

.testimonial-content {
  margin-bottom: 15px;
  position: relative;
}

.testimonial-content i {
  position: absolute;
  top: 0;
  left: 0;
  color: #e5e7eb;
  font-size: 1.5rem;
}

.testimonial-content p {
  margin: 0;
  padding-left: 25px;
  color: #4b5563;
  font-style: italic;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #1e40af;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.author-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.author-role {
  font-size: 0.8rem;
  color: #6b7280;
}

/* FAQ Styles */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.faq-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.faq-question {
  padding: 15px 20px;
  background-color: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.faq-question i {
  color: #6b7280;
}

.faq-answer {
  padding: 15px 20px;
  border-top: 1px solid #e5e7eb;
  background-color: #fff;
}

.faq-answer p {
  margin: 0;
  color: #4b5563;
  line-height: 1.6;
}

/* CTA Section */
.cta-section {
  background-color: #1e40af;
  color: white;
  text-align: center;
  padding: 40px 20px;
  border-radius: 12px;
  margin-top: 20px;
  margin-bottom: 40px;
}

.cta-section h2 {
  margin: 0 0 15px 0;
  font-size: 1.8rem;
}

.cta-section p {
  margin: 0 0 25px 0;
  opacity: 0.9;
}

.cta-button {
  background-color: white;
  color: #1e40af;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
}

.modal-content {
  position: relative;
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 1001;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #1e40af;
}

.modal-close {
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: 25px;
  text-align: center;
}

.success-animation {
  font-size: 3rem;
  color: #10b981;
  margin-bottom: 20px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.rewards-info {
  margin-top: 25px;
  text-align: left;
}

.rewards-info h4 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
  color: #1e40af;
}

.rewards-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rewards-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
}

.rewards-list li:last-child {
  border-bottom: none;
}

.rewards-list li i {
  color: #1e40af;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.modal-button {
  background-color: #1e40af;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.modal-button:hover {
  background-color: #1e3a8a;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .celebrity-profile {
    flex-direction: column;
  }
  
  .profile-image {
    flex: 0 0 auto;
    max-width: 250px;
    margin: 0 auto;
  }
  
  .time-blocks::before {
    left: 15px;
  }
  
  .time-point {
    width: 30px;
    height: 30px;
    font-size: 0.8rem;
    margin-right: 15px;
  }
}

@media (max-width: 576px) {
  .page-header h1 {
    font-size: 2rem;
  }
  
  .section-title {
    font-size: 1.1rem;
  }
  
  .section-content {
    padding: 15px;
  }
  
  .testimonial-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="home">
    <!-- Hero Section -->
    <header id="home" class="hero-section py-5">
      <div class="container py-5 mt-5">
        <div class="row align-items-center">
          <div class="col-lg-6">
            <h1 class="display-4 fw-bold mb-3">Revolutionary Web3 Crypto Streaming</h1>
            <p class="lead mb-4">Stream payments in real-time with the power of blockchain technology. Secure, fast, and decentralized.</p>
            <div class="d-flex gap-3">
              <router-link to="/dashboard" class="btn btn-primary btn-lg">Launch App</router-link>
              <a href="#how-it-works" class="btn btn-outline-secondary btn-lg">Learn More</a>
            </div>
          </div>
          <div class="col-lg-6">
            <img src="/images/hero-illustration.svg" alt="Crypto Streaming Illustration" class="img-fluid rounded shadow-lg">
          </div>
        </div>
      </div>
    </header>

    <!-- Features Section -->
    <section id="features" class="py-5 bg-light">
      <div class="container py-5">
        <div class="text-center mb-5">
          <h2 class="display-5 fw-bold">Why Choose CryptoStream?</h2>
          <p class="lead">Our platform offers unmatched features for Web3 streaming payments</p>
        </div>
        <div class="row g-4">
          <div class="col-md-4" v-for="(feature, index) in features" :key="index">
            <div class="card h-100 border-0 shadow-sm">
              <div class="card-body text-center p-4">
                <div class="feature-icon bg-primary bg-gradient text-white mb-3">
                  <i :class="feature.icon"></i>
                </div>
                <h3 class="card-title h5 fw-bold">{{ feature.title }}</h3>
                <p class="card-text">{{ feature.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it Works Section -->
    <section id="how-it-works" class="py-5">
      <div class="container py-5">
        <div class="text-center mb-5">
          <h2 class="display-5 fw-bold">How It Works</h2>
          <p class="lead">Three simple steps to start streaming crypto payments</p>
        </div>
        <div class="row g-4 align-items-center">
          <div class="col-md-4" v-for="(step, index) in steps" :key="index">
            <div class="text-center">
              <div class="step-number mb-4">{{ index + 1 }}</div>
              <h3 class="h4">{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          </div>
        </div>
        <div class="text-center mt-5">
          <router-link to="/dashboard" class="btn btn-primary btn-lg">Get Started Now</router-link>
        </div>
      </div>
    </section>

    <!-- More sections would be added here from the index.html template -->
  </div>
</template>

<script setup>
import { ref } from 'vue';

const features = ref([
  {
    icon: 'fas fa-lock fa-2x',
    title: 'Secure Transactions',
    description: 'End-to-end encryption with blockchain security for every transaction.'
  },
  {
    icon: 'fas fa-bolt fa-2x',
    title: 'Instant Payments',
    description: 'Real-time payment streaming with no delays or processing times.'
  },
  {
    icon: 'fas fa-code fa-2x',
    title: 'Developer Friendly',
    description: 'Easy integration with comprehensive APIs and documentation.'
  }
]);

const steps = ref([
  {
    title: 'Connect Your Wallet',
    description: 'Link your Ethereum wallet securely to our platform using Web3 standards.'
  },
  {
    title: 'Set Up Stream',
    description: 'Configure payment parameters including recipient, rate, and duration.'
  },
  {
    title: 'Start Streaming',
    description: 'Begin real-time payment streams that execute automatically on-chain.'
  }
]);
</script>

<style scoped>
.step-number {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin: 0 auto;
}
</style>

<template>
  <div class="investment-view" :class="theme">
    <div class="view-header">
      <h2>Investment Dashboard</h2>
      <p class="subtitle">Manage your investments and track performance</p>
    </div>

    <div class="dashboard-content">
      <div class="left-panel">
        <year-to-date-metrics />
        <investment-portfolio :wallet-address="walletAddress" :wallet-connected="walletConnected" />
      </div>

      <div class="right-panel">
        <invest-button :wallet-address="walletAddress" :wallet-connected="walletConnected" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import InvestmentPortfolio from '@/components/investment/InvestmentPortfolio.vue';
import InvestButton from '@/components/investment/InvestButton.vue';
import YearToDateMetrics from '@/components/analytics/YearToDateMetrics.vue';

const theme = inject('currentTheme', 'roman-theme');

defineProps({
  walletConnected: {
    type: Boolean,
    default: false
  },
  walletAddress: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.investment-view {
  padding: 20px;
}

.view-header {
  margin-bottom: 20px;
}

.view-header h2 {
  margin: 0;
  font-size: 2rem;
}

.view-header .subtitle {
  color: #777;
  font-size: 1rem;
}

.dashboard-content {
  display: flex;
  gap: 20px;
}

.left-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-panel {
  flex: 1;
}
</style>

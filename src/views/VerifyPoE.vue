<template>
  <div class="verify-poe">
    <div class="container py-4">
      <h1 class="h3">Verify Proof of Existence</h1>
      <p>Hash: {{ hash }}</p>
      <div v-if="isVerified" class="alert alert-success">
        <i class="fas fa-check-circle me-2"></i> This hash exists on the blockchain.
      </div>
      <div v-else-if="isVerified === false" class="alert alert-danger">
        <i class="fas fa-times-circle me-2"></i> This hash does not exist on the blockchain.
      </div>
      <div v-else class="text-muted">Verifying...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ethers } from 'ethers'
import { useRoute } from 'vue-router'

const route = useRoute()
const hash = route.params.hash
const isVerified = ref(null)

onMounted(async () => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const contract = new ethers.Contract(
      'YOUR_CONTRACT_ADDRESS', // Replace with your deployed contract address
      ['function verifyHash(string memory hash) public view returns (bool)'], // Replace with your contract ABI
      provider
    )
    isVerified.value = await contract.verifyHash(hash)
  } catch (error) {
    console.error('Error verifying hash:', error)
    isVerified.value = false
  }
})
</script>

<style scoped>
.verify-poe {
  padding-top: 1rem;
}
</style>

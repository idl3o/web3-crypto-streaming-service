<template>
  <div class="user-profile-card" :class="theme">
    <!-- Existing profile card content -->
    <!-- ...existing code... -->

    <!-- Add certificates section after other user info -->
    <div v-if="certificates.length > 0" class="user-certificates">
      <h5 class="certificates-title">Certificates</h5>
      <div class="certificates-list">
        <CommunityBadge 
          v-for="cert in certificates"
          :key="cert.id"
          :certificate="cert"
          size="medium"
          :show-label="true"
        />
      </div>
    </div>
    
    <!-- Add buffs section after certificates -->
    <div v-if="showBuffs" class="user-buffs">
      <h5 class="buffs-title">
        Active Buffs
        <span v-if="hasSunihamishBuff" class="sunihamish-indicator">
          <i class="fas fa-sun"></i> Sunihamish Enhanced
        </span>
      </h5>
      <div class="buffs-list">
        <UserBuffsList
          :user-address="props.user.address"
          size="medium"
          :show-labels="true"
          :filter="{ activeOnly: true }"
        />
      </div>
    </div>

    <!-- ...existing code... -->
  </div>
</template>

<script setup>
// ...existing imports...
import { onMounted, ref, computed } from 'vue';
import * as CertificateService from '@/services/CertificateService';
import * as BuffService from '@/services/BuffService';
import CommunityBadge from '@/components/certificate/CommunityBadge.vue';
import UserBuffsList from '@/components/buffs/UserBuffsList.vue';

// ...existing props and code...

// Add certificates and buffs state
const certificates = ref([]);
const userBuffs = ref([]);
const showBuffs = ref(false);

// Computed properties
const hasSunihamishBuff = computed(() => {
  return userBuffs.value.some(
    buff => buff.type === BuffService.BUFF_TYPES.SUNIHAMISH && 
           buff.status === BuffService.BUFF_STATUS.ACTIVE
  );
});

// Load user certificates and buffs
onMounted(async () => {
  if (props.user && props.user.address) {
    try {
      // Load certificates
      const userCerts = await CertificateService.getUserCertificates(props.user.address);
      certificates.value = userCerts;
      
      // Load buffs
      const buffs = await BuffService.getUserBuffs(props.user.address);
      userBuffs.value = buffs;
      showBuffs.value = buffs.length > 0;
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }
});

// ...existing code...
</script>

<style scoped>
/* ...existing styles... */

.user-certificates,
.user-buffs {
  margin-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 1rem;
}

.certificates-title,
.buffs-title {
  font-size: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sunihamish-indicator {
  font-size: 0.8rem;
  color: #FFD700;
  animation: glow 2s infinite alternate;
  display: flex;
  align-items: center;
  gap: 4px;
}

@keyframes glow {
  from {
    text-shadow: 0 0 1px #FFD700;
  }
  to {
    text-shadow: 0 0 3px #FFD700, 0 0 5px #FFD700;
  }
}

.certificates-list,
.buffs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
}
</style>
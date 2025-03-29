<template>
  <div class="mobile-navigation" :class="theme">
    <router-link 
      v-for="item in navItems" 
      :key="item.path" 
      :to="item.path" 
      class="nav-item"
      :class="{ active: isActive(item.path) }"
    >
      <i :class="item.icon"></i>
      <span>{{ item.label }}</span>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue';
import { useRoute } from 'vue-router';

const theme = inject('currentTheme', 'roman-theme');
const route = useRoute();

const navItems = [
  { path: '/', label: 'Home', icon: 'fas fa-home' },
  { path: '/content', label: 'Content', icon: 'fas fa-play' },
  { path: '/transactions', label: 'Wallet', icon: 'fas fa-wallet' },
  { path: '/score', label: 'Score', icon: 'fas fa-trophy' },
  { path: '/fae', label: 'Fae', icon: 'fas fa-star' }
];

function isActive(path: string): boolean {
  return route.path === path || 
    (path !== '/' && route.path.startsWith(path));
}
</script>

<style scoped>
.mobile-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: #fff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #777;
  padding: 8px 0;
  width: 20%;
}

.nav-item i {
  font-size: 1.2rem;
  margin-bottom: 4px;
}

.nav-item span {
  font-size: 0.7rem;
}

.nav-item.active {
  color: #4CAF50;
}

/* Theme-specific styling */
.mobile-navigation.roman-theme {
  background-color: #fcf8f3;
  border-top: 1px solid #d5c3aa;
}

.roman-theme .nav-item.active {
  color: #8B4513;
}

.mobile-navigation.arc-theme {
  background-color: white;
  box-shadow: 0 -2px 12px rgba(30, 41, 59, 0.08);
}

.arc-theme .nav-item.active {
  color: var(--arc-primary);
}

.mobile-navigation.vacay-theme {
  background: linear-gradient(120deg, rgba(255,255,255,0.8) 0%, rgba(247,253,255,0.9) 100%);
  box-shadow: 0 -2px 10px rgba(33, 150, 243, 0.1);
}

.vacay-theme .nav-item.active {
  color: var(--vacay-primary);
}
</style>

<template>
  <div class="comic-view container py-4">
    <!-- Add Score Banner -->
    <ScoreBanner :theme="theme" />
    
    <h1 class="comic-title">Level Up Your Crypto Experience</h1>
    <h3 class="comic-subtitle">A Visual Guide to the Scoring System</h3>
    
    <div class="comic-container">
      <div v-for="(panel, index) in comicPanels" :key="index" class="comic-panel" :class="theme">
        <div class="panel-number">{{ index + 1 }}</div>
        <h4 class="panel-title">{{ panel.title }}</h4>
        <div class="panel-placeholder">
          <i :class="panel.icon"></i>
          <div class="panel-description">{{ panel.description }}</div>
        </div>
        <div class="panel-dialogue">
          <div class="dialogue-bubble">
            <strong>{{ panel.speaker }}:</strong> "{{ panel.dialogue }}"
          </div>
        </div>
        <div v-if="panel.scoreUpdate" class="score-update">
          <ScoreBadge size="small" :theme="theme" />
          <span class="update-text">{{ panel.scoreUpdate }}</span>
        </div>
      </div>
    </div>
    
    <div class="comic-footer">
      <p>Want to see this feature in action? <router-link to="/score">Visit your Score Dashboard</router-link></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue';
import ScoreBadge from '@/components/score/ScoreBadge.vue';
import ScoreBanner from '@/components/score/ScoreBanner.vue';

const theme = inject('currentTheme', ref('roman-theme'));

const comicPanels = [
  {
    title: "Introduction",
    description: "A cheerful character introduces the scoring system",
    icon: "fas fa-trophy",
    speaker: "Guide",
    dialogue: "Welcome to the Web3 Crypto Streaming Service! Did you know you can earn points and level up while enjoying content?",
    scoreUpdate: null
  },
  {
    title: "Starting Out",
    description: "Character begins watching content",
    icon: "fas fa-play-circle",
    speaker: "Guide",
    dialogue: "When you start streaming content, you automatically begin earning points! Everyone starts at 'Novice' rank.",
    scoreUpdate: "50 points"
  },
  {
    title: "First Transaction",
    description: "Character completes their first streaming payment",
    icon: "fas fa-exchange-alt",
    speaker: "Guide",
    dialogue: "Each transaction earns you different types of points. Streaming gives me Streaming Points!",
    scoreUpdate: "+100 Streaming Points"
  },
  {
    title: "Multiple Categories",
    description: "Various score categories are displayed",
    icon: "fas fa-layer-group",
    speaker: "Guide",
    dialogue: "There are six different score categories that contribute to your overall rank.",
    scoreUpdate: null
  },
  {
    title: "Leveling Up",
    description: "Character's rank increases to Intermediate",
    icon: "fas fa-arrow-circle-up",
    speaker: "Guide",
    dialogue: "Yes! I've reached 500 points and leveled up to Intermediate!",
    scoreUpdate: "Rank Increased!"
  },
  {
    title: "Civilization Building",
    description: "Character builds structures in their civilization",
    icon: "fas fa-building",
    speaker: "Guide",
    dialogue: "Building structures in my civilization earns Building points and gives permanent bonuses!",
    scoreUpdate: "+50 Building Points"
  },
  {
    title: "Engagement Features",
    description: "Character reacts to and reviews content",
    icon: "fas fa-heart",
    speaker: "Guide",
    dialogue: "Engaging with content through reactions, reviews, and highlights earns engagement points!",
    scoreUpdate: "+20 Engagement Points"
  },
  {
    title: "Achievement Unlocked",
    description: "Character receives an achievement trophy",
    icon: "fas fa-award",
    speaker: "System",
    dialogue: "Achievement Unlocked: Essence Collector!",
    scoreUpdate: "+30 Essence Points"
  },
  {
    title: "Checking the Leaderboard",
    description: "Character views their rank on the leaderboard",
    icon: "fas fa-list-ol",
    speaker: "Guide",
    dialogue: "The leaderboard shows how I compare to other users in different categories. I'm #3 in Streaming!",
    scoreUpdate: null
  },
  {
    title: "Master Rank",
    description: "Character achieves Master rank",
    icon: "fas fa-star",
    speaker: "Guide",
    dialogue: "After reaching 5,000 points, I've achieved Master rank! Only Legendary remains at 10,000 points!",
    scoreUpdate: "Master Rank Achieved!"
  },
  {
    title: "The Full Experience",
    description: "Complete view of character's achievements",
    icon: "fas fa-globe",
    speaker: "Guide",
    dialogue: "The scoring system makes every action meaningful in the Web3 streaming world! What will you build?",
    scoreUpdate: null
  }
];
</script>

<style scoped>
.comic-view {
  padding-bottom: 3rem;
}

.comic-title {
  text-align: center;
  margin-bottom: 0.5rem;
}

.comic-subtitle {
  text-align: center;
  margin-bottom: 2rem;
  color: #666;
}

.comic-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.comic-panel {
  position: relative;
  border: 2px solid #ccc;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  background-color: #fff;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.panel-number {
  position: absolute;
  top: -10px;
  left: -10px;
  background-color: #333;
  color: white;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
}

.panel-title {
  margin-top: 0;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.panel-placeholder {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.panel-placeholder i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #666;
}

.panel-description {
  text-align: center;
  font-size: 0.9rem;
  color: #666;
}

.panel-dialogue {
  margin-bottom: 1rem;
}

.dialogue-bubble {
  background-color: #f0f0f0;
  border-radius: 12px;
  padding: 0.75rem;
  position: relative;
}

.dialogue-bubble::before {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 20px;
  border-width: 10px 10px 0;
  border-style: solid;
  border-color: #f0f0f0 transparent transparent;
}

.score-update {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  font-size: 0.9rem;
  color: #4caf50;
}

.comic-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

/* Roman theme */
.roman-theme.comic-panel {
  border-color: #d5c3aa;
  background-color: #fcf8f3;
}

.roman-theme .panel-title {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
  border-bottom-color: #d5c3aa;
}

.roman-theme .panel-placeholder {
  background-color: #f9f5ef;
}

.roman-theme .dialogue-bubble {
  background-color: #f3efe7;
}

.roman-theme .dialogue-bubble::before {
  border-color: #f3efe7 transparent transparent;
}

/* Arc theme */
.arc-theme.comic-panel {
  border: none;
  background-color: white;
  border-radius: 16px;
  box-shadow: var(--arc-shadow);
}

.arc-theme .panel-number {
  background-color: var(--arc-primary);
}

.arc-theme .panel-title {
  font-family: 'Montserrat', sans-serif;
  color: var(--arc-text-primary);
  border-bottom-color: var(--arc-border);
}

.arc-theme .panel-placeholder {
  background-color: var(--arc-surface);
}

.arc-theme .dialogue-bubble {
  background-color: var(--arc-surface);
}

.arc-theme .dialogue-bubble::before {
  border-color: var(--arc-surface) transparent transparent;
}

/* Vacay theme */
.vacay-theme.comic-panel {
  border: none;
  background: linear-gradient(120deg, rgba(255,255,255,0.8) 0%, rgba(247,253,255,0.9) 100%);
  border-radius: 12px;
  box-shadow: var(--vacay-shadow);
}

.vacay-theme .panel-number {
  background-color: var(--vacay-primary);
}

.vacay-theme .panel-title {
  font-family: 'Pacifico', cursive;
  color: var(--vacay-primary);
}

.vacay-theme .panel-placeholder {
  background-color: rgba(224, 247, 250, 0.3);
}

.vacay-theme .dialogue-bubble {
  background-color: rgba(224, 247, 250, 0.3);
}

.vacay-theme .dialogue-bubble::before {
  border-color: rgba(224, 247, 250, 0.3) transparent transparent;
}
</style>

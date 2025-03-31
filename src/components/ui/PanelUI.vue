<template>
  <div class="panel-ui" :class="[variant, { 'no-padding': noPadding }]">
    <div v-if="title || $slots.header" class="panel-header">
      <h3 v-if="title" class="panel-title">{{ title }}</h3>
      <slot name="header"></slot>
      <div v-if="collapsible" class="panel-collapse-btn" @click="toggleCollapsed">
        <i :class="collapsed ? 'icon-expand' : 'icon-collapse'"></i>
      </div>
    </div>
    
    <div class="panel-body" v-show="!collapsed">
      <slot></slot>
    </div>
    
    <div v-if="$slots.footer" class="panel-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PanelUI',
  props: {
    title: {
      type: String,
      default: ''
    },
    variant: {
      type: String,
      default: 'default',
      validator: (value: string) => ['default', 'primary', 'secondary', 'crypto', 'dark'].includes(value)
    },
    noPadding: {
      type: Boolean,
      default: false
    },
    collapsible: {
      type: Boolean,
      default: false
    },
    initialCollapsed: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      collapsed: this.initialCollapsed
    };
  },
  methods: {
    toggleCollapsed() {
      this.collapsed = !this.collapsed;
      this.$emit('collapse-toggle', this.collapsed);
    }
  }
});
</script>

<style scoped>
.panel-ui {
  background-color: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color, #dfe6e9);
  transition: box-shadow 0.3s ease;
}

.panel-ui:hover {
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.08);
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #dfe6e9);
  background-color: rgba(0, 0, 0, 0.02);
}

.panel-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-color, #333);
  flex: 1;
}

.panel-body {
  padding: 1.5rem;
}

.no-padding .panel-body {
  padding: 0;
}

.panel-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color, #dfe6e9);
  background-color: rgba(0, 0, 0, 0.02);
}

/* Variants */
.panel-ui.primary {
  border-color: var(--primary-color, #6c5ce7);
}

.panel-ui.primary .panel-header {
  background-color: var(--primary-color, #6c5ce7);
  color: white;
}

.panel-ui.primary .panel-title {
  color: white;
}

.panel-ui.secondary {
  border-color: var(--secondary-color, #a29bfe);
}

.panel-ui.secondary .panel-header {
  background-color: var(--secondary-color, #a29bfe);
  color: white;
}

.panel-ui.secondary .panel-title {
  color: white;
}

.panel-ui.crypto {
  border-color: #f7931a; /* Bitcoin orange */
  border-left-width: 3px;
}

.panel-ui.dark {
  background-color: #2d3436;
  border-color: #2d3436;
}

.panel-ui.dark .panel-header {
  background-color: #1e272e;
  border-color: #1e272e;
}

.panel-ui.dark .panel-title,
.panel-ui.dark .panel-body,
.panel-ui.dark .panel-footer {
  color: white;
}

.panel-collapse-btn {
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  margin-left: 0.5rem;
}

.panel-collapse-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.icon-collapse:before {
  content: "▼";
  font-size: 0.7em;
}

.icon-expand:before {
  content: "►";
  font-size: 0.7em;
}
</style>

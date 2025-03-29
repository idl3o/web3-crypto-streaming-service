<template>
    <div class="theme-switcher">
        <select v-model="selectedTheme" @change="setTheme">
            <option v-for="(theme, name) in themeOptions" :key="name" :value="name">
                {{ theme.label }}
            </option>
        </select>
    </div>
</template>

<script setup>
import { ref, inject } from 'vue';

const theme = inject('theme');
const selectedTheme = ref(theme.current.value);

const themeOptions = {
    'roman-theme': { label: 'Roman' },
    'arc-theme': { label: 'Arc' },
    'vacay-theme': { label: 'Vacay' }
};

function setTheme() {
    theme.setTheme(selectedTheme.value);
}
</script>

<style scoped>
.theme-switcher {
    display: inline-block;
    margin-left: 1rem;
}

select {
    padding: 0.5rem 1rem;
    border-radius: 5px;
    border: 1px solid #ccc;
    background-color: white;
    font-size: 0.875rem;
}
</style>

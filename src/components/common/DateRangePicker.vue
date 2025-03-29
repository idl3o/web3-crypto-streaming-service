<template>
    <div class="date-range-picker" :class="[theme, { 'is-open': isOpen }]">
        <div class="range-display" @click="togglePicker">
            <div class="selected-range-text">
                <span v-if="selectedRange">{{ selectedRange }}</span>
                <span v-else>{{ placeholder }}</span>
            </div>
            <div class="picker-toggle-icon">
                <i class="fas" :class="isOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </div>
        </div>

        <div v-if="isOpen" class="picker-dropdown">
            <!-- Preset Options -->
            <div v-if="showPresets" class="preset-options">
                <button v-for="preset in presets" :key="preset.label" class="preset-option"
                    :class="{ active: activePreset === preset.label }" @click="selectPreset(preset)">
                    {{ preset.label }}
                </button>
                <button class="preset-option custom-option" :class="{ active: activePreset === 'custom' }"
                    @click="activateCustomRange">
                    Custom Range
                </button>
            </div>

            <!-- Custom Range Picker -->
            <div v-if="showCustomPicker" class="custom-range-picker">
                <div class="date-inputs">
                    <div class="date-input-group">
                        <label>Start Date</label>
                        <input type="date" v-model="startDateInput"
                            :min="minDate ? formatInputDate(minDate) : undefined"
                            :max="maxDate ? formatInputDate(maxDate) : undefined" @change="updateRange">
                    </div>
                    <div class="date-input-group">
                        <label>End Date</label>
                        <input type="date" v-model="endDateInput"
                            :min="startDateInput || (minDate ? formatInputDate(minDate) : undefined)"
                            :max="maxDate ? formatInputDate(maxDate) : undefined" @change="updateRange">
                    </div>
                </div>

                <div class="time-inputs" v-if="includeTime">
                    <div class="time-input-group">
                        <label>Start Time</label>
                        <input type="time" v-model="startTimeInput" @change="updateRange">
                    </div>
                    <div class="time-input-group">
                        <label>End Time</label>
                        <input type="time" v-model="endTimeInput" @change="updateRange">
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="picker-actions">
                <button class="cancel-action" @click="cancelSelection">Cancel</button>
                <button class="apply-action" @click="applySelection" :disabled="!isValidRange">Apply</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, inject, nextTick, onMounted, onBeforeUnmount } from 'vue';
import {
    formatDate,
    getCommonDateRanges,
    FORMAT,
    parseDate,
    formatDateRange,
    isDateInRange
} from '@/services/DateTimeService';

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => ({})
    },
    placeholder: {
        type: String,
        default: 'Select date range'
    },
    includeTime: {
        type: Boolean,
        default: false
    },
    minDate: {
        type: [Date, String],
        default: null
    },
    maxDate: {
        type: [Date, String],
        default: null
    },
    showPresets: {
        type: Boolean,
        default: true
    },
    dateFormat: {
        type: String,
        default: FORMAT.SHORT_DATE
    }
});

const emit = defineEmits(['update:modelValue', 'change']);
const theme = inject('currentTheme', 'roman-theme');

// Component state
const isOpen = ref(false);
const activePreset = ref('');
const showCustomPicker = ref(false);
const startDateInput = ref('');
const endDateInput = ref('');
const startTimeInput = ref('00:00');
const endTimeInput = ref('23:59');
const presets = ref(getCommonDateRanges());

// Computed
const selectedRange = computed(() => {
    if (!props.modelValue?.startDate) return '';

    try {
        return formatDateRange(
            props.modelValue.startDate,
            props.modelValue.endDate,
            { format: props.dateFormat }
        );
    } catch (e) {
        console.error('Error formatting date range:', e);
        return '';
    }
});

const isValidRange = computed(() => {
    if (!startDateInput.value) return false;
    if (!endDateInput.value) return false;

    const start = parseDate(startDateInput.value);
    const end = parseDate(endDateInput.value);

    if (!start || !end) return false;

    return start <= end;
});

// Methods
function togglePicker() {
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
        // Initialize the picker based on current value
        initializeFromValue();
    }
}

function initializeFromValue() {
    // Clear active preset by default
    activePreset.value = '';

    const { startDate, endDate } = props.modelValue;

    if (!startDate || !endDate) {
        // Default to today if no range is set
        const today = new Date();
        startDateInput.value = formatInputDate(today);
        endDateInput.value = formatInputDate(today);

        if (props.includeTime) {
            startTimeInput.value = '00:00';
            endTimeInput.value = '23:59';
        }

        showCustomPicker.value = false;
        return;
    }

    // Set input fields
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (start && end) {
        startDateInput.value = formatInputDate(start);
        endDateInput.value = formatInputDate(end);

        if (props.includeTime) {
            startTimeInput.value = formatInputTime(start);
            endTimeInput.value = formatInputTime(end);
        }

        // Check if the current range matches a preset
        checkForMatchingPreset(start, end);
    }
}

function checkForMatchingPreset(start, end) {
    // First try to find exact match with presets
    for (const preset of presets.value) {
        const presetStart = parseDate(preset.start);
        const presetEnd = parseDate(preset.end);

        if (!presetStart || !presetEnd) continue;

        // Compare only dates if time is not included
        if (!props.includeTime) {
            if (isSameDay(start, presetStart) && isSameDay(end, presetEnd)) {
                activePreset.value = preset.label;
                showCustomPicker.value = false;
                return;
            }
        } else {
            // Compare exact timestamps
            if (
                Math.abs(start.getTime() - presetStart.getTime()) < 60000 &&
                Math.abs(end.getTime() - presetEnd.getTime()) < 60000
            ) {
                activePreset.value = preset.label;
                showCustomPicker.value = false;
                return;
            }
        }
    }

    // If no match, mark as custom
    activePreset.value = 'custom';
    showCustomPicker.value = true;
}

function selectPreset(preset) {
    activePreset.value = preset.label;
    showCustomPicker.value = false;

    const start = parseDate(preset.start);
    const end = parseDate(preset.end);

    if (start && end) {
        startDateInput.value = formatInputDate(start);
        endDateInput.value = formatInputDate(end);

        if (props.includeTime) {
            startTimeInput.value = formatInputTime(start);
            endTimeInput.value = formatInputTime(end);
        }
    }
}

function activateCustomRange() {
    activePreset.value = 'custom';
    showCustomPicker.value = true;
}

function updateRange() {
    // When inputs change, check if they match a preset
    if (!startDateInput.value || !endDateInput.value) return;

    const start = parseInputDate(startDateInput.value, startTimeInput.value);
    const end = parseInputDate(endDateInput.value, endTimeInput.value);

    if (start && end) {
        checkForMatchingPreset(start, end);
    }
}

function applySelection() {
    if (!isValidRange.value) return;

    const startDate = parseInputDate(startDateInput.value, startTimeInput.value);
    const endDate = parseInputDate(endDateInput.value, endTimeInput.value);

    if (!startDate || !endDate) return;

    const range = {
        startDate,
        endDate,
        preset: activePreset.value !== 'custom' ? activePreset.value : null
    };

    emit('update:modelValue', range);
    emit('change', range);

    isOpen.value = false;
}

function cancelSelection() {
    isOpen.value = false;
}

function formatInputDate(date) {
    if (!date) return '';

    const d = parseDate(date);
    if (!d) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatInputTime(date) {
    if (!date) return '00:00';

    const d = parseDate(date);
    if (!d) return '00:00';

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
}

function parseInputDate(dateStr, timeStr = '00:00') {
    if (!dateStr) return null;

    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);

        return new Date(year, month - 1, day, hours, minutes);
    } catch (e) {
        console.error('Error parsing input date:', e);
        return null;
    }
}

function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;

    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

// Click outside handler
function handleClickOutside(e) {
    const picker = document.querySelector('.date-range-picker');
    if (picker && !picker.contains(e.target)) {
        isOpen.value = false;
    }
}

// Lifecycle hooks
onMounted(() => {
    document.addEventListener('click', handleClickOutside);

    // Initialize from initial value if any
    if (props.modelValue?.startDate) {
        nextTick(() => initializeFromValue());
    }
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

// Watch for external changes to modelValue
watch(() => props.modelValue, (newVal) => {
    if (!isOpen.value && newVal?.startDate) {
        nextTick(() => initializeFromValue());
    }
}, { deep: true });
</script>

<style scoped>
.date-range-picker {
    position: relative;
    width: 100%;
    max-width: 320px;
    font-size: 14px;
}

.range-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.range-display:hover {
    border-color: #a0a0a0;
}

.date-range-picker.is-open .range-display {
    border-color: #2196F3;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.selected-range-text {
    color: #333;
}

.picker-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #ffffff;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
    overflow: hidden;
}

.preset-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
}

.preset-option {
    background: #f5f5f5;
    border: none;
    border-radius: 4px;
    padding: 8px;
    text-align: center;
    cursor: pointer;
    transition: background-color 0.2s;
}

.preset-option:hover {
    background: #e0e0e0;
}

.preset-option.active {
    background: #2196F3;
    color: #ffffff;
}

.custom-option {
    grid-column: span 3;
    margin-top: 8px;
}

.custom-range-picker {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
}

.date-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
}

.time-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.date-input-group,
.time-input-group {
    display: flex;
    flex-direction: column;
}

.date-input-group label,
.time-input-group label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
}

.date-input-group input,
.time-input-group input {
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.2s;
}

.date-input-group input:focus,
.time-input-group input:focus {
    border-color: #2196F3;
    outline: none;
}

.picker-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px;
}

.cancel-action,
.apply-action {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
}

.cancel-action {
    background: #f5f5f5;
    color: #333;
}

.cancel-action:hover {
    background: #e0e0e0;
}

.apply-action {
    background: #2196F3;
    color: white;
}

.apply-action:hover {
    background: #1976D2;
}

.apply-action:disabled {
    background: #90CAF9;
    cursor: not-allowed;
}

/* Roman theme */
.roman-theme .range-display {
    background-color: rgba(255, 252, 245, 0.8);
    border-color: var(--border-color, #D2B48C);
}

.roman-theme.is-open .range-display {
    border-color: var(--primary-color, #8B4513);
    box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
}

.roman-theme .picker-dropdown {
    background-color: rgba(255, 252, 245, 0.95);
    border-color: var(--border-color, #D2B48C);
}

.roman-theme .preset-option {
    background-color: rgba(210, 180, 140, 0.1);
}

.roman-theme .preset-option:hover {
    background-color: rgba(210, 180, 140, 0.2);
}

.roman-theme .preset-option.active {
    background-color: var(--primary-color, #8B4513);
}

.roman-theme .date-input-group input:focus,
.roman-theme .time-input-group input:focus {
    border-color: var(--primary-color, #8B4513);
}

.roman-theme .apply-action {
    background-color: var(--primary-color, #8B4513);
}

.roman-theme .apply-action:hover {
    background-color: var(--primary-dark-color, #704012);
}

.roman-theme .apply-action:disabled {
    background-color: #D2B48C;
}
</style>

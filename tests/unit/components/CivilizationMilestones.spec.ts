import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CivilizationMilestones from '@/components/civilization/CivilizationMilestones.vue';

// Mock the civilization store
vi.mock('@/stores/civilizationStore', () => ({
    useCivilizationStore: () => ({
        level: {
            level: 3,
            name: 'Town',
            icon: '🏙️',
        },
        CIVILIZATION_LEVELS: [
            { level: 1, name: 'Settlement', requiredPoints: 0, icon: '🏕️', reward: 'Basic Fee Discount (1%)' },
            { level: 2, name: 'Village', requiredPoints: 100, icon: '🏘️', reward: 'Enhanced Essence (+5%)' },
            { level: 3, name: 'Town', requiredPoints: 250, icon: '🏙️', reward: 'Fee Discount (2%)' },
            { level: 4, name: 'City', requiredPoints: 500, icon: '🌆', reward: 'Daily Essence Bonus' },
        ]
    }),
}));

describe('CivilizationMilestones', () => {
    it('renders correct number of milestone items', () => {
        const wrapper = mount(CivilizationMilestones);
        const milestoneItems = wrapper.findAll('.milestone-item');

        expect(milestoneItems.length).toBe(4);
    });

    it('marks completed milestones correctly', () => {
        const wrapper = mount(CivilizationMilestones);
        const completedMilestones = wrapper.findAll('.milestone-item.completed');

        // Current level is 3, so levels 1, 2, and 3 should be marked as completed
        expect(completedMilestones.length).toBe(3);
    });

    it('marks current milestone correctly', () => {
        const wrapper = mount(CivilizationMilestones);
        const currentMilestone = wrapper.find('.milestone-item.current');

        expect(currentMilestone.exists()).toBe(true);
        expect(currentMilestone.find('.milestone-name').text()).toBe('Town');
    });

    it('applies theme classes correctly', async () => {
        const wrapper = mount(CivilizationMilestones, {
            props: {
                theme: 'arc-theme'
            }
        });

        expect(wrapper.classes()).toContain('arc-theme');

        await wrapper.setProps({ theme: 'vacay-theme' });
        expect(wrapper.classes()).toContain('vacay-theme');
    });
});

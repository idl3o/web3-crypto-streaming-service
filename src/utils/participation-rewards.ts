export interface ParticipationActivity {
    type: 'watch' | 'share' | 'comment' | 'create' | 'curate' | 'stake';
    duration?: number;
    impact?: number;
    timestamp: number;
}

export class ParticipationRewards {
    private readonly baseRewards = {
        watch: 1,      // Base points per minute
        share: 5,      // Base points per share
        comment: 3,    // Base points per comment
        create: 10,    // Base points per content created
        curate: 2,     // Base points per curation
        stake: 0.1     // Base points per token staked per day
    };

    private readonly multipliers = {
        consistency: 1.2,  // Regular participation bonus
        quality: 1.5,     // High-quality contribution bonus
        community: 1.3    // Community engagement bonus
    };

    calculateRewards(activities: ParticipationActivity[]): number {
        return activities.reduce((total, activity) => {
            const basePoints = this.getBasePoints(activity);
            const multiplier = this.getMultiplier(activity);
            return total + (basePoints * multiplier);
        }, 0);
    }

    private getBasePoints(activity: ParticipationActivity): number {
        const base = this.baseRewards[activity.type];

        if (activity.type === 'watch') {
            return base * (activity.duration || 0);
        }

        if (activity.type === 'stake') {
            return base * (activity.duration || 1) * (activity.impact || 1);
        }

        return base;
    }

    private getMultiplier(activity: ParticipationActivity): number {
        let multiplier = 1;

        // Consistency bonus for regular participation
        if (this.isConsistentParticipant(activity)) {
            multiplier *= this.multipliers.consistency;
        }

        // Quality bonus for well-received contributions
        if (this.isQualityContribution(activity)) {
            multiplier *= this.multipliers.quality;
        }

        // Community bonus for engaging with others
        if (this.isCommunityEngagement(activity)) {
            multiplier *= this.multipliers.community;
        }

        return multiplier;
    }

    private isConsistentParticipant(activity: ParticipationActivity): boolean {
        // Check if user has participated regularly in the last 7 days
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return activity.timestamp > weekAgo;
    }

    private isQualityContribution(activity: ParticipationActivity): boolean {
        return activity.impact ? activity.impact > 5 : false;
    }

    private isCommunityEngagement(activity: ParticipationActivity): boolean {
        return ['comment', 'curate', 'share'].includes(activity.type);
    }
}

import { EventEmitter } from 'events';
import { AssistantBot } from '../services/bots/AssistantBot';

interface ContestConfig {
    name: string;
    startTime: number;
    duration: number;
    minParticipants: number;
    maxParticipants: number;
    entryFee: number;
    prizePool: number;
}

interface Participant {
    botId: string;
    bot: AssistantBot;
    score: number;
    ranking: number;
    trades: number;
    profit: number;
}

export class TradingContest extends EventEmitter {
    private config: ContestConfig;
    private participants: Map<string, Participant> = new Map();
    private active: boolean = false;
    private leaderboard: Participant[] = [];
    private readonly UPDATE_INTERVAL = 5000;

    constructor(config: ContestConfig) {
        super();
        this.config = config;
        this.validateConfig();
    }

    private validateConfig(): void {
        if (this.config.prizePool < this.config.minParticipants * this.config.entryFee) {
            throw new Error('Prize pool must be greater than total entry fees');
        }
    }

    public async registerParticipant(bot: AssistantBot): Promise<boolean> {
        if (this.participants.size >= this.config.maxParticipants) {
            return false;
        }

        const participant: Participant = {
            botId: bot.getCredits().toString(),
            bot,
            score: 0,
            ranking: 0,
            trades: 0,
            profit: 0
        };

        this.participants.set(participant.botId, participant);
        this.emit('participantJoined', { botId: participant.botId });
        return true;
    }

    public async startContest(): Promise<void> {
        if (this.participants.size < this.config.minParticipants) {
            throw new Error('Not enough participants');
        }

        this.active = true;
        this.emit('contestStarted', { 
            participants: this.participants.size,
            prizePool: this.config.prizePool
        });

        this.runSimulation();
        setTimeout(() => this.endContest(), this.config.duration);
    }

    private async runSimulation(): Promise<void> {
        const updateInterval = setInterval(() => {
            if (!this.active) {
                clearInterval(updateInterval);
                return;
            }

            this.updateScores();
            this.updateLeaderboard();
            this.emit('leaderboardUpdate', this.getLeaderboard());
        }, this.UPDATE_INTERVAL);
    }

    private updateScores(): void {
        for (const participant of this.participants.values()) {
            // Simulate trading performance
            const tradeResult = Math.random() * 2 - 1; // -1 to 1
            participant.profit += tradeResult;
            participant.trades++;
            participant.score = this.calculateScore(participant);
        }
    }

    private calculateScore(participant: Participant): number {
        return (participant.profit * 0.7) + 
               (participant.trades * 0.3);
    }

    private updateLeaderboard(): void {
        this.leaderboard = Array.from(this.participants.values())
            .sort((a, b) => b.score - a.score)
            .map((p, index) => ({
                ...p,
                ranking: index + 1
            }));
    }

    private async endContest(): Promise<void> {
        this.active = false;
        const winners = this.calculatePrizes();
        this.distributeRewards(winners);
        
        this.emit('contestEnded', {
            winners,
            totalPrizePool: this.config.prizePool
        });
    }

    private calculatePrizes(): Participant[] {
        const winners = this.leaderboard.slice(0, 3);
        const prizeDistribution = [0.5, 0.3, 0.2]; // 50%, 30%, 20%

        winners.forEach((winner, index) => {
            const prize = this.config.prizePool * prizeDistribution[index];
            winner.profit += prize;
        });

        return winners;
    }

    private async distributeRewards(winners: Participant[]): Promise<void> {
        winners.forEach(winner => {
            winner.bot.addPriceAlert('winner', winner.profit, 'above');
        });
    }

    public getLeaderboard(): Participant[] {
        return [...this.leaderboard];
    }

    public getContestStatus(): object {
        return {
            active: this.active,
            participants: this.participants.size,
            timeRemaining: this.active ? 
                this.config.startTime + this.config.duration - Date.now() : 0,
            prizePool: this.config.prizePool
        };
    }
}

import { BaseView } from '@/mvc/core/BaseView';
import { computed, ref } from 'vue';
import { StreamingController } from '@/mvc/controllers/StreamingController';
import { StreamingModel, StreamingStatus, StreamQuality } from '@/mvc/models/StreamingModel';
import { ContentModel } from '@/mvc/models/ContentModel';
import { ContentController } from '@/mvc/controllers/ContentController';

/**
 * Interface for streaming state exposed to Vue components
 */
interface StreamingViewState {
    activeStream: StreamingModel | null;
    stats: {
        status: StreamingStatus;
        quality: StreamQuality;
        duration: number;
        durationFormatted: string;
        bufferHealth: number;
        currentCost: number;
        currentCostFormatted: string;
    };
    isStreaming: boolean;
    isPaused: boolean;
    isBuffering: boolean;
    hasError: boolean;
    errorMessage: string;
    content: ContentModel | null;
}

/**
 * StreamingView connects StreamingController to Vue components
 */
export class StreamingView extends BaseView<StreamingViewState, StreamingController> {
    private contentController: ContentController;

    constructor(controller: StreamingController, contentController: ContentController) {
        // Initialize with default state
        super({
            activeStream: null,
            stats: {
                status: StreamingStatus.IDLE,
                quality: StreamQuality.AUTO,
                duration: 0,
                durationFormatted: '00:00',
                bufferHealth: 100,
                currentCost: 0,
                currentCostFormatted: '0.000'
            },
            isStreaming: false,
            isPaused: false,
            isBuffering: false,
            hasError: false,
            errorMessage: '',
            content: null
        }, controller);

        this.contentController = contentController;

        // Initialize state from controller
        this.updateFromController();
    }

    /**
     * Load content by ID and prepare for streaming
     */
    public async loadContent(contentId: string): Promise<boolean> {
        try {
            const success = await this.contentController.loadContent(contentId);

            if (success) {
                const content = this.contentController.model;

                // Update content in state
                this.updateState(state => {
                    state.content = content;
                });

                // Set content in streaming controller
                this.controller.setContent(content);

                // Track view (in a real app, might only do this after certain duration)
                await this.contentController.trackView();

                return true;
            }

            return false;
        } catch (error: any) {
            this.updateState(state => {
                state.hasError = true;
                state.errorMessage = `Failed to load content: ${error.message}`;
            });
            return false;
        }
    }

    /**
     * Start streaming at the specified quality
     */
    public async startStream(quality: StreamQuality = StreamQuality.AUTO): Promise<boolean> {
        try {
            const success = await this.controller.startStream(quality);

            if (success) {
                this.updateFromController();
                return true;
            } else {
                this.updateState(state => {
                    state.hasError = true;
                    state.errorMessage = this.controller.model.error || 'Failed to start stream';
                });
                return false;
            }
        } catch (error: any) {
            this.updateState(state => {
                state.hasError = true;
                state.errorMessage = error.message;
            });
            return false;
        }
    }

    /**
     * Stop the active stream
     */
    public async stopStream(): Promise<void> {
        await this.controller.stopStream();
        this.updateFromController();
    }

    /**
     * Pause the active stream
     */
    public pauseStream(): void {
        this.controller.pauseStream();
        this.updateFromController();
    }

    /**
     * Resume a paused stream
     */
    public resumeStream(): void {
        this.controller.resumeStream();
        this.updateFromController();
    }

    /**
     * Change streaming quality
     */
    public changeQuality(quality: StreamQuality): void {
        this.controller.changeQuality(quality);
        this.updateFromController();
    }

    /**
     * Format duration in seconds to MM:SS
     */
    private formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Format amount in ETH with 6 decimal places
     */
    private formatEth(amount: number): string {
        return amount.toFixed(6);
    }

    /**
     * Update view state from controller
     */
    private updateFromController(): void {
        const model = this.controller.model;
        const stats = this.controller.getStats();

        this.updateState(state => {
            state.activeStream = model;
            state.stats = {
                status: stats.status,
                quality: stats.quality,
                duration: stats.duration,
                durationFormatted: this.formatDuration(stats.duration),
                bufferHealth: stats.bufferHealth,
                currentCost: stats.currentCost,
                currentCostFormatted: this.formatEth(stats.currentCost)
            };

            state.isStreaming = model.status === StreamingStatus.ACTIVE;
            state.isPaused = model.status === StreamingStatus.PAUSED;
            state.isBuffering = model.bufferHealth < 30;
            state.hasError = model.status === StreamingStatus.ERROR;
            state.errorMessage = model.error;
        });
    }
}

/**
 * Hook to use the streaming view in Vue components
 */
export function useStreamingView() {
    const streamingModel = new StreamingModel();
    const contentModel = new ContentModel();

    const streamingController = new StreamingController(streamingModel);
    const contentController = new ContentController(contentModel);

    const view = new StreamingView(streamingController, contentController);

    // Clean up on unmount
    onUnmount(() => {
        streamingController.dispose();
    });

    return {
        // Expose state
        state: view.state,

        // Expose actions
        loadContent: view.loadContent.bind(view),
        startStream: view.startStream.bind(view),
        stopStream: view.stopStream.bind(view),
        pauseStream: view.pauseStream.bind(view),
        resumeStream: view.resumeStream.bind(view),
        changeQuality: view.changeQuality.bind(view)
    };
}

// Helper function for composition API
function onUnmount(fn: () => void) {
    const unmountedRef = ref(false);

    // Only available in setup
    if (getCurrentInstance()) {
        onUnmounted(() => {
            unmountedRef.value = true;
            fn();
        });
    }
}

// Helper function to get current component instance
function getCurrentInstance() {
    try {
        // Access Vue's internal API (will fail if not in setup)
        return require('vue').getCurrentInstance();
    } catch {
        return null;
    }
}

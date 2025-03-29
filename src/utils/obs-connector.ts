export interface StreamConfig {
    websocketUrl: string;
    streamKey: string;
    quality: 'low' | 'medium' | 'high';
    bitrate: number;
}

export class OBSConnector {
    private socket: WebSocket | null = null;
    private stream: MediaStream | null = null;

    async connect(config: StreamConfig): Promise<boolean> {
        try {
            this.socket = new WebSocket(config.websocketUrl);
            await this.setupWebRTC(config);
            return true;
        } catch (error) {
            console.error('OBS connection failed:', error);
            return false;
        }
    }

    private async setupWebRTC(config: StreamConfig) {
        const peerConnection = new RTCPeerConnection();
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { max: 60 }
            },
            audio: true
        });

        this.stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, this.stream!);
        });
    }

    startStreaming(onCreditCharge: (amount: number) => void) {
        if (!this.stream) return;

        // Simulate credit consumption every minute
        setInterval(() => {
            onCreditCharge(5); // 5 credits per minute
        }, 60000);
    }

    stopStreaming() {
        this.stream?.getTracks().forEach(track => track.stop());
        this.socket?.close();
    }
}

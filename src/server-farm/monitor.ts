import { farm } from './simulator';
import WebSocket from 'ws';
import { CreatorAuth } from '../auth/creator';

export class StreamMonitor {
    private ws: WebSocket.Server;

    constructor(port: number = 8080) {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        const spinner = setInterval(() => {
            process.stdout.write(`\r${frames[i = ++i % frames.length]} Loading... `);
        }, 80);

        try {
            this.ws = new WebSocket.Server({
                port,
                clientTracking: true,
                handleProtocols: () => 'crypto-stream'
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket server error:', error);
                this.attemptReconnect(port);
            });

            this.ws.on('connection', (socket) => {
                socket.on('message', (msg) => {
                    const { token, command } = JSON.parse(msg.toString());
                    if (CreatorAuth.getInstance().verifyCreatorAccess(token)) {
                        this.handleCreatorCommand(command);
                    }
                });
                farm.on('metrics', (data) => {
                    socket.send(JSON.stringify(data));
                });
            });

            setInterval(() => {
                farm.observeStream('localhost:3000');
            }, 1000);

            setTimeout(() => {
                clearInterval(spinner);
                console.log('\r🎮 Game On! Server Farm Ready!');
            }, 2000);
        } catch (error) {
            console.error('Failed to start WebSocket server:', error);
            this.attemptReconnect(port);
        }
    }

    private attemptReconnect(port: number, retries = 0) {
        if (retries < 5) {
            console.log(`Attempting to reconnect... (${retries + 1}/5)`);
            setTimeout(() => {
                try {
                    this.ws = new WebSocket.Server({ port });
                    console.log('Successfully reconnected!');
                } catch (error) {
                    this.attemptReconnect(port, retries + 1);
                }
            }, 2000 * (retries + 1));
        }
    }

    private handleCreatorCommand(command: string) {
        console.log('🔓 Creator command:', command);
    }

    getOriginStats() {
        return {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        };
    }
}

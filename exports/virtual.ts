import { VirtualExport } from '../src/types/exports';
import os from 'os';

async function exportVirtualData(): Promise<VirtualExport> {
    return {
        timestamp: Date.now(),
        version: process.env.npm_package_version || '1.0.0',
        origin: 'virtual-stream',
        virtualNodes: os.cpus().length,
        simulatedLatency: Math.random() * 100,
        resourceUtilization: Array(os.cpus().length).fill(0).map(() => Math.random() * 100)
    };
}

exportVirtualData().then(console.log);

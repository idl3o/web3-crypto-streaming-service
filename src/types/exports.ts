export interface ExportMetadata {
    timestamp: number;
    version: string;
    origin: string;
}

export interface QuantumExport extends ExportMetadata {
    entanglementRatio: number;
    quantumStates: number[];
    coherenceTime: number;
}

export interface TheoreticalExport extends ExportMetadata {
    probabilityMatrix: number[][];
    dimensionalVariance: number;
    theoreticalLimit: number;
}

export interface VirtualExport extends ExportMetadata {
    virtualNodes: number;
    simulatedLatency: number;
    resourceUtilization: number[];
}

/**
 * Zero-Knowledge Proof Service
 * Manages generation and verification of zero-knowledge proofs for the application
 */

import { EventEmitter } from 'events';
import {
    ZKProofType,
    ZKProofInput,
    ZKProofResult,
    generateProof,
    verifyProof
} from '../utils/ZKProofUtils';

/**
 * Different use cases for zero-knowledge proofs in the application
 */
export enum ZKProofUseCase {
    AGE_VERIFICATION = 'age_verification',
    BALANCE_PROOF = 'balance_proof',
    OWNERSHIP_PROOF = 'ownership_proof',
    IDENTITY_PROOF = 'identity_proof',
    VIEWING_RIGHTS = 'viewing_rights',
    STREAM_ACCESS = 'stream_access'
}

/**
 * Stores information about a generated proof
 */
export interface StoredProof {
    id: string;
    proofType: ZKProofType;
    useCase: ZKProofUseCase;
    proof: any;
    publicSignals: any[];
    timestamp: number;
    expiresAt?: number;
    metadata?: Record<string, any>;
}

/**
 * Service for managing zero-knowledge proofs
 */
export class ZKProofService extends EventEmitter {
    private proofStore: Map<string, StoredProof> = new Map();
    private circuitStore: Map<string, { circuit: string; provingKey: string; verificationKey: any }> = new Map();

    constructor() {
        super();
        this.initializeCircuits();
    }

    /**
     * Initialize available circuits
     * @private
     */
    private initializeCircuits(): void {
        // Register available circuits with their keys
        // In a real implementation, these would be loaded from files or a remote source

        // Age verification circuit (proving user is above certain age without revealing birth date)
        this.registerCircuit(
            ZKProofUseCase.AGE_VERIFICATION,
            'age_verification_circuit',
            'age_verification.zkey',
            { type: 'groth16', id: 'age_verification' }
        );

        // Balance proof circuit (proving user has sufficient balance without revealing actual amount)
        this.registerCircuit(
            ZKProofUseCase.BALANCE_PROOF,
            'balance_proof_circuit',
            'balance_proof.zkey',
            { type: 'plonk', id: 'balance_proof' }
        );

        // Ownership proof (proving ownership of a private key without revealing it)
        this.registerCircuit(
            ZKProofUseCase.OWNERSHIP_PROOF,
            'ownership_proof_circuit',
            'ownership_proof.zkey',
            { type: 'groth16', id: 'ownership_proof' }
        );

        // Identity proof (proving identity without revealing personal information)
        this.registerCircuit(
            ZKProofUseCase.IDENTITY_PROOF,
            'identity_proof_circuit',
            'identity_proof.zkey',
            { type: 'plonk', id: 'identity_proof' }
        );

        // Viewing rights (proving right to view content without revealing purchase details)
        this.registerCircuit(
            ZKProofUseCase.VIEWING_RIGHTS,
            'viewing_rights_circuit',
            'viewing_rights.zkey',
            { type: 'groth16', id: 'viewing_rights' }
        );

        // Stream access (proving right to access premium stream)
        this.registerCircuit(
            ZKProofUseCase.STREAM_ACCESS,
            'stream_access_circuit',
            'stream_access.zkey',
            { type: 'plonk', id: 'stream_access' }
        );
    }

    /**
     * Register a circuit for use by the service
     * @param useCase The use case for this circuit
     * @param circuit Circuit identifier or path
     * @param provingKey Proving key identifier or path
     * @param verificationKey Verification key
     */
    public registerCircuit(
        useCase: ZKProofUseCase,
        circuit: string,
        provingKey: string,
        verificationKey: any
    ): void {
        this.circuitStore.set(useCase, { circuit, provingKey, verificationKey });
    }

    /**
     * Generate a zero-knowledge proof for a specific use case
     * @param useCase The use case for the proof
     * @param publicInputs Public inputs for the proof
     * @param privateInputs Private inputs for the proof (sensitive data)
     * @param metadata Additional metadata for the proof
     * @param expirationTime Optional expiration time in seconds
     * @returns Promise with the generated proof
     */
    public async generateProofForUseCase(
        useCase: ZKProofUseCase,
        publicInputs: any[],
        privateInputs: any,
        metadata?: Record<string, any>,
        expirationTime?: number
    ): Promise<StoredProof> {
        // Get circuit information for the use case
        const circuitInfo = this.circuitStore.get(useCase);
        if (!circuitInfo) {
            throw new Error(`No circuit registered for use case: ${useCase}`);
        }

        // Determine proof type based on the use case
        const proofType = this.getProofTypeForUseCase(useCase);

        // Prepare input for proof generation
        const input: ZKProofInput = {
            proofType,
            publicInputs,
            privateInputs,
            circuit: circuitInfo.circuit,
            provingKey: circuitInfo.provingKey
        };

        // Generate the proof
        const proofResult = await generateProof(input);

        // Create unique ID for the proof
        const proofId = this.generateProofId();

        // Calculate expiration time if provided
        const expiresAt = expirationTime ? Date.now() + (expirationTime * 1000) : undefined;

        // Store the proof
        const storedProof: StoredProof = {
            id: proofId,
            proofType,
            useCase,
            proof: proofResult.proof,
            publicSignals: proofResult.publicSignals,
            timestamp: Date.now(),
            expiresAt,
            metadata
        };

        this.proofStore.set(proofId, storedProof);

        // Emit event for new proof
        this.emit('proof:generated', { proofId, useCase });

        return storedProof;
    }

    /**
     * Verify a previously stored proof
     * @param proofId ID of the proof to verify
     * @returns Promise with verification result
     */
    public async verifyStoredProof(proofId: string): Promise<boolean> {
        const storedProof = this.proofStore.get(proofId);
        if (!storedProof) {
            throw new Error(`Proof not found with ID: ${proofId}`);
        }

        // Check if proof has expired
        if (storedProof.expiresAt && Date.now() > storedProof.expiresAt) {
            this.emit('proof:expired', { proofId, useCase: storedProof.useCase });
            return false;
        }

        // Get circuit info for the use case
        const circuitInfo = this.circuitStore.get(storedProof.useCase);
        if (!circuitInfo) {
            throw new Error(`No circuit registered for use case: ${storedProof.useCase}`);
        }

        // Verify the proof
        const isValid = await verifyProof(
            storedProof.proof,
            storedProof.publicSignals,
            circuitInfo.verificationKey,
            storedProof.proofType
        );

        // Emit event for verification result
        if (isValid) {
            this.emit('proof:verified', { proofId, useCase: storedProof.useCase });
        } else {
            this.emit('proof:invalid', { proofId, useCase: storedProof.useCase });
        }

        return isValid;
    }

    /**
     * Verify an external proof (not stored in the service)
     * @param useCase The use case for the proof
     * @param proof The proof data
     * @param publicSignals Public signals/inputs for the proof
     * @returns Promise with verification result
     */
    public async verifyExternalProof(
        useCase: ZKProofUseCase,
        proof: any,
        publicSignals: any[]
    ): Promise<boolean> {
        // Get circuit info for the use case
        const circuitInfo = this.circuitStore.get(useCase);
        if (!circuitInfo) {
            throw new Error(`No circuit registered for use case: ${useCase}`);
        }

        const proofType = this.getProofTypeForUseCase(useCase);

        // Verify the proof
        return await verifyProof(
            proof,
            publicSignals,
            circuitInfo.verificationKey,
            proofType
        );
    }

    /**
     * Get a stored proof by ID
     * @param proofId ID of the proof to retrieve
     * @returns The stored proof or undefined if not found
     */
    public getProof(proofId: string): StoredProof | undefined {
        return this.proofStore.get(proofId);
    }

    /**
     * Delete a stored proof
     * @param proofId ID of the proof to delete
     * @returns True if proof was deleted, false otherwise
     */
    public deleteProof(proofId: string): boolean {
        const result = this.proofStore.delete(proofId);
        if (result) {
            this.emit('proof:deleted', { proofId });
        }
        return result;
    }

    /**
     * Get all proofs for a specific use case
     * @param useCase The use case to filter by
     * @returns Array of stored proofs
     */
    public getProofsForUseCase(useCase: ZKProofUseCase): StoredProof[] {
        return Array.from(this.proofStore.values())
            .filter(proof => proof.useCase === useCase);
    }

    /**
     * Get all stored proofs
     * @returns Array of all stored proofs
     */
    public getAllProofs(): StoredProof[] {
        return Array.from(this.proofStore.values());
    }

    /**
     * Clear expired proofs from storage
     * @returns Number of proofs cleared
     */
    public clearExpiredProofs(): number {
        const now = Date.now();
        let clearedCount = 0;

        for (const [proofId, proof] of this.proofStore.entries()) {
            if (proof.expiresAt && now > proof.expiresAt) {
                this.proofStore.delete(proofId);
                this.emit('proof:expired', { proofId, useCase: proof.useCase });
                clearedCount++;
            }
        }

        return clearedCount;
    }

    /**
     * Determine proof type to use for a given use case
     * @private
     */
    private getProofTypeForUseCase(useCase: ZKProofUseCase): ZKProofType {
        switch (useCase) {
            case ZKProofUseCase.AGE_VERIFICATION:
                return ZKProofType.RANGE_PROOF;
            case ZKProofUseCase.BALANCE_PROOF:
                return ZKProofType.RANGE_PROOF;
            case ZKProofUseCase.OWNERSHIP_PROOF:
                return ZKProofType.GROTH16;
            case ZKProofUseCase.IDENTITY_PROOF:
                return ZKProofType.PLONK;
            case ZKProofUseCase.VIEWING_RIGHTS:
                return ZKProofType.MERKLE_PROOF;
            case ZKProofUseCase.STREAM_ACCESS:
                return ZKProofType.GROTH16;
            default:
                return ZKProofType.GROTH16;
        }
    }

    /**
     * Generate a unique ID for a proof
     * @private
     */
    private generateProofId(): string {
        // Generate a random UUID
        return 'zkp_' + Date.now().toString(36) + '_' +
            Math.random().toString(36).substring(2, 15);
    }
}

// Create a singleton instance
export const zkProofService = new ZKProofService();
export default zkProofService;

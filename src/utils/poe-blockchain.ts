import Web3 from 'web3';

export interface PoERecord {
    hash: string;
    timestamp: number;
    owner: string;
    contentType: string;
    metadata: {
        title: string;
        duration: number;
        size: number;
    };
}

export class PoEBlockchain {
    private web3: Web3;
    private contract: any;
    private contractAddress: string;

    constructor() {
        this.contractAddress = process.env.POE_CONTRACT_ADDRESS || '';
        this.web3 = new Web3(window.ethereum);
        this.initContract();
    }

    private async initContract() {
        const abi = [
            {
                "inputs": [
                    { "name": "hash", "type": "string" },
                    { "name": "metadata", "type": "string" }
                ],
                "name": "registerContent",
                "outputs": [{ "name": "success", "type": "bool" }],
                "type": "function"
            },
            {
                "inputs": [{ "name": "hash", "type": "string" }],
                "name": "verifyContent",
                "outputs": [
                    { "name": "exists", "type": "bool" },
                    { "name": "timestamp", "type": "uint256" },
                    { "name": "owner", "type": "address" }
                ],
                "type": "function"
            }
        ];

        this.contract = new this.web3.eth.Contract(abi, this.contractAddress);
    }

    async registerContent(content: Buffer, metadata: PoERecord['metadata']): Promise<string> {
        const hash = this.web3.utils.sha3(content);
        const accounts = await this.web3.eth.getAccounts();

        await this.contract.methods.registerContent(
            hash,
            JSON.stringify(metadata)
        ).send({ from: accounts[0] });

        return hash;
    }

    async verifyContent(hash: string): Promise<PoERecord | null> {
        try {
            const result = await this.contract.methods.verifyContent(hash).call();

            if (!result.exists) return null;

            return {
                hash,
                timestamp: Number(result.timestamp),
                owner: result.owner,
                contentType: 'video/stream',
                metadata: JSON.parse(result.metadata)
            };
        } catch (error) {
            console.error('PoE verification failed:', error);
            return null;
        }
    }

    async getContentHistory(address: string): Promise<PoERecord[]> {
        const events = await this.contract.getPastEvents('ContentRegistered', {
            filter: { owner: address },
            fromBlock: 0
        });

        return events.map(event => ({
            hash: event.returnValues.hash,
            timestamp: Number(event.returnValues.timestamp),
            owner: event.returnValues.owner,
            contentType: 'video/stream',
            metadata: JSON.parse(event.returnValues.metadata)
        }));
    }
}

import { ethers } from 'ethers';

export class StreamingService {
    private contract: ethers.Contract;

    constructor(contractAddress: string, abi: any, provider: ethers.providers.Web3Provider) {
        this.contract = new ethers.Contract(contractAddress, abi, provider.getSigner());
    }

    async initializeStream(contentId: string, duration: number): Promise<string> {
        const streamCost = await this.contract.calculateStreamCost(duration);
        const tx = await this.contract.startStream(contentId, {
            value: streamCost,
        });

        await tx.wait();
        return tx.hash;
    }

    async getStreamingCredits(address: string): Promise<number> {
        return await this.contract.balanceOf(address);
    }

    async purchaseCredits(amount: number): Promise<string> {
        const tx = await this.contract.purchaseCredits({
            value: ethers.utils.parseEther(amount.toString()),
        });

        await tx.wait();
        return tx.hash;
    }
}

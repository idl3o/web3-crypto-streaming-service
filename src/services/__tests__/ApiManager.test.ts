import { ApiManager } from '../ApiManager';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fs
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ApiManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock for axios.create
        mockedAxios.create.mockReturnValue(mockedAxios);
    });

    it('should initialize with default config', () => {
        const apiManager = new ApiManager();
        expect(apiManager).toBeDefined();
    });

    it('should load fallback RPC endpoints from file', () => {
        // Mock file reading
        mockedFs.readFileSync.mockReturnValueOnce(
            JSON.stringify(['https://rpc1.example.com', 'https://rpc2.example.com'])
        );

        const apiManager = new ApiManager({
            fallbackRpcFile: 'config/rpc-endpoints.json',
        });

        // Test a private property using any type assertion
        const config = (apiManager as any).config;
        expect(config.endpoints).toContain('https://rpc1.example.com');
        expect(config.endpoints).toContain('https://rpc2.example.com');
    });

    it('should make a successful API request', async () => {
        // Mock successful axios response
        mockedAxios.request.mockResolvedValueOnce({
            data: { success: true },
            status: 200,
            headers: { 'content-type': 'application/json' },
        });

        const apiManager = new ApiManager({
            endpoints: ['https://api.example.com'],
        });

        const response = await apiManager.request('GET', '/test');

        expect(response.data).toEqual({ success: true });
        expect(response.status).toBe(200);
        expect(response.cached).toBe(false);
    });

    it('should retry failed requests', async () => {
        // First request fails, second succeeds
        mockedAxios.request.mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({
                data: { success: true },
                status: 200,
                headers: { 'content-type': 'application/json' },
            });

        const apiManager = new ApiManager({
            endpoints: ['https://api.example.com'],
            maxRetries: 3,
        });

        const response = await apiManager.request('GET', '/test');

        expect(mockedAxios.request).toHaveBeenCalledTimes(2);
        expect(response.data).toEqual({ success: true });
        expect(response.retryCount).toBe(1);
    });

    it('should use cache for repeated requests', async () => {
        // Mock successful axios response
        mockedAxios.request.mockResolvedValueOnce({
            data: { success: true },
            status: 200,
            headers: { 'content-type': 'application/json' },
        });

        const apiManager = new ApiManager({
            endpoints: ['https://api.example.com'],
            cacheEnabled: true,
        });

        // First request should hit the API
        await apiManager.request('GET', '/test');

        // Second request should use cache
        const cachedResponse = await apiManager.request('GET', '/test');

        expect(mockedAxios.request).toHaveBeenCalledTimes(1);
        expect(cachedResponse.cached).toBe(true);
    });

    it('should make a successful RPC call', async () => {
        // Mock successful RPC response
        mockedAxios.request.mockResolvedValueOnce({
            data: {
                jsonrpc: '2.0',
                id: 1,
                result: { blockNumber: '0x1', timestamp: '0x123456' }
            },
            status: 200,
            headers: { 'content-type': 'application/json' },
        });

        const apiManager = new ApiManager({
            endpoints: ['https://rpc.example.com'],
        });

        const result = await apiManager.rpcCall('eth_getBlockByNumber', ['latest', true]);

        expect(result).toEqual({ blockNumber: '0x1', timestamp: '0x123456' });
        expect(mockedAxios.request).toHaveBeenCalledWith(expect.objectContaining({
            method: 'POST',
            data: expect.objectContaining({
                jsonrpc: '2.0',
                method: 'eth_getBlockByNumber',
                params: ['latest', true]
            })
        }));
    });

    it('should fetch content from IPFS', async () => {
        // Mock successful IPFS response
        const mockContent = Buffer.from('test content');
        mockedAxios.request.mockResolvedValueOnce({
            data: mockContent,
            status: 200,
            headers: { 'content-type': 'application/octet-stream' },
        });

        const apiManager = new ApiManager({
            useIpfsGateway: true,
            ipfsGateways: ['https://ipfs.io/ipfs/'],
        });

        const content = await apiManager.fetchFromIpfs('QmTest');

        expect(content).toEqual(mockContent);
        expect(mockedAxios.request).toHaveBeenCalledWith(expect.objectContaining({
            method: 'GET',
            url: 'https://ipfs.io/ipfs/QmTest',
        }));
    });
});
```

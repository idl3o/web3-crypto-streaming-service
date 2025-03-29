import { findShortestPath, createNetworkGraph, findOptimalCrossChainPath } from '@/utils/ShortestPathFinder';

describe('ShortestPathFinder', () => {
  describe('findShortestPath', () => {
    it('should find the shortest path between two nodes', () => {
      // Create a test graph
      const graph = {
        nodes: {
          'a': { id: 'a', name: 'Node A' },
          'b': { id: 'b', name: 'Node B' },
          'c': { id: 'c', name: 'Node C' },
          'd': { id: 'd', name: 'Node D' }
        },
        adjacencyList: {
          'a': [
            { source: 'a', target: 'b', weight: 1 },
            { source: 'a', target: 'c', weight: 3 }
          ],
          'b': [
            { source: 'b', target: 'c', weight: 1 },
            { source: 'b', target: 'd', weight: 4 }
          ],
          'c': [
            { source: 'c', target: 'd', weight: 1 }
          ],
          'd': []
        }
      };
      
      // Find path from A to D
      const result = findShortestPath(graph, 'a', 'd');
      
      // Assert correct path and distance
      expect(result).not.toBeNull();
      expect(result.path).toEqual(['a', 'b', 'c', 'd']);
      expect(result.distance).toBe(3);
      expect(result.edges.length).toBe(3);
    });
    
    it('should return null when no path exists', () => {
      // Create a test graph with no path from A to D
      const graph = {
        nodes: {
          'a': { id: 'a', name: 'Node A' },
          'd': { id: 'd', name: 'Node D' }
        },
        adjacencyList: {
          'a': [],
          'd': []
        }
      };
      
      // Find path from A to D
      const result = findShortestPath(graph, 'a', 'd');
      
      // Assert no path found
      expect(result).toBeNull();
    });
    
    it('should handle custom weight functions', () => {
      // Create a test graph
      const graph = {
        nodes: {
          'a': { id: 'a', name: 'Node A' },
          'b': { id: 'b', name: 'Node B' },
          'c': { id: 'c', name: 'Node C' }
        },
        adjacencyList: {
          'a': [
            { source: 'a', target: 'b', weight: 1, metadata: { security: 5 } },
            { source: 'a', target: 'c', weight: 2, metadata: { security: 9 } }
          ],
          'b': [],
          'c': []
        }
      };
      
      // Custom weight function that prioritizes security
      const weightFn = (edge) => {
        return 10 - (edge.metadata?.security || 0);
      };
      
      // Find path from A to C
      const result = findShortestPath(graph, 'a', 'c', weightFn);
      
      // Assert path goes through C directly because it's more secure
      expect(result).not.toBeNull();
      expect(result.path).toEqual(['a', 'c']);
    });
  });
  
  describe('createNetworkGraph', () => {
    it('should create a valid graph from networks and gateways', () => {
      const networks = [
        { id: 'eth', name: 'Ethereum' },
        { id: 'poly', name: 'Polygon' },
        { id: 'bnb', name: 'BNB Chain' }
      ];
      
      const gateways = [
        {
          id: 'g1',
          name: 'Gateway 1',
          supportedNetworks: ['eth', 'poly'],
          speed: 8,
          security: 7,
          fee: 2
        },
        {
          id: 'g2',
          name: 'Gateway 2',
          supportedNetworks: ['poly', 'bnb'],
          speed: 5,
          security: 9,
          fee: 1
        }
      ];
      
      const graph = createNetworkGraph(networks, gateways);
      
      // Check nodes
      expect(Object.keys(graph.nodes)).toHaveLength(3);
      expect(graph.nodes['eth']).toBeDefined();
      expect(graph.nodes['poly']).toBeDefined();
      expect(graph.nodes['bnb']).toBeDefined();
      
      // Check edges
      expect(graph.adjacencyList['eth']).toHaveLength(1); // Only to poly
      expect(graph.adjacencyList['poly']).toHaveLength(2); // To eth and bnb
      expect(graph.adjacencyList['bnb']).toHaveLength(1); // Only to poly
      
      // Check edge metadata
      const ethToPolyEdge = graph.adjacencyList['eth'][0];
      expect(ethToPolyEdge.metadata.gatewayId).toBe('g1');
    });
  });
  
  describe('findOptimalCrossChainPath', () => {
    it('should find optimal path based on optimization criteria', () => {
      const networks = [
        { id: 'eth', name: 'Ethereum' },
        { id: 'poly', name: 'Polygon' },
        { id: 'avax', name: 'Avalanche' },
        { id: 'bnb', name: 'BNB Chain' }
      ];
      
      const gateways = [
        {
          id: 'fast',
          name: 'Fast Bridge',
          supportedNetworks: ['eth', 'poly'],
          speed: 9,    // Fast
          security: 6,  // Medium security
          fee: 5       // Expensive
        },
        {
          id: 'secure',
          name: 'Secure Bridge',
          supportedNetworks: ['eth', 'avax'],
          speed: 4,    // Slow
          security: 9,  // High security
          fee: 3       // Medium cost
        },
        {
          id: 'cheap',
          name: 'Budget Bridge',
          supportedNetworks: ['poly', 'bnb', 'avax'],
          speed: 6,    // Medium speed
          security: 5,  // Low security
          fee: 1       // Very cheap
        }
      ];
      
      // Test optimizing for speed
      const speedPath = findOptimalCrossChainPath(
        networks, gateways, 'eth', 'bnb', { optimize: 'speed' }
      );
      expect(speedPath.path).toEqual(['eth', 'poly', 'bnb']);
      
      // Test optimizing for security
      const securityPath = findOptimalCrossChainPath(
        networks, gateways, 'eth', 'avax', { optimize: 'security' }
      );
      expect(securityPath.path).toEqual(['eth', 'avax']);
      
      // Test optimizing for cost
      const costPath = findOptimalCrossChainPath(
        networks, gateways, 'eth', 'bnb', { optimize: 'cost' }
      );
      expect(costPath.path).toEqual(['eth', 'poly', 'bnb']);
    });
  });
});

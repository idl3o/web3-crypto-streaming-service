/**
 * TypeCast Shortest Path Finder
 * 
 * Provides typed graph traversal algorithms to find optimal paths between
 * blockchain networks for the Web3 Crypto Streaming Service.
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} id - Unique identifier for the node
 * @property {string} name - Human-readable name
 * @property {string} type - Node type (e.g., 'blockchain', 'gateway')
 * @property {Object} [metadata] - Additional node-specific properties
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} source - Source node ID
 * @property {string} target - Target node ID
 * @property {number} weight - Edge weight/cost
 * @property {string} [type] - Edge type (e.g., 'direct', 'bridge')
 * @property {Object} [metadata] - Additional edge-specific properties
 */

/**
 * @typedef {Object} Graph
 * @property {Object.<string, GraphNode>} nodes - Map of node ID to node
 * @property {Object.<string, GraphEdge[]>} adjacencyList - Map of node ID to outgoing edges
 */

/**
 * @typedef {Object} ShortestPathResult
 * @property {string[]} path - Array of node IDs forming the path
 * @property {number} distance - Total distance/cost of the path
 * @property {GraphEdge[]} edges - Edges used in the path
 */

/**
 * Find the shortest path between two nodes using Dijkstra's algorithm
 * 
 * @param {Graph} graph - The graph containing nodes and edges
 * @param {string} startId - Starting node ID
 * @param {string} endId - Destination node ID
 * @param {Function} [weightFn] - Optional custom weight function: (edge) => number
 * @returns {ShortestPathResult|null} The shortest path or null if no path exists
 */
export function findShortestPath(graph, startId, endId, weightFn = null) {
  // Improve input validation
  if (!graph || typeof graph !== 'object' || !graph.nodes || !graph.adjacencyList) {
    throw new TypeError('Graph must be a valid object with nodes and adjacencyList properties');
  }
  
  if (!startId || typeof startId !== 'string') {
    throw new TypeError('Start node ID must be a string');
  }
  
  if (!endId || typeof endId !== 'string') {
    throw new TypeError('End node ID must be a string');
  }
  
  // Add validation for weightFn
  if (weightFn !== null && typeof weightFn !== 'function') {
    throw new TypeError('Weight function must be a function or null');
  }
  
  // Ensure nodes exist
  const startNode = /** @type {GraphNode} */ (graph.nodes[startId]);
  const endNode = /** @type {GraphNode} */ (graph.nodes[endId]);
  
  if (!startNode) {
    throw new Error(`Start node ${startId} not found in graph`);
  }
  
  if (!endNode) {
    throw new Error(`End node ${endId} not found in graph`);
  }
  
  // Return early if start and end are the same
  if (startId === endId) {
    return { 
      path: [startId], 
      distance: 0, 
      edges: [] 
    };
  }
  
  // Use the provided weight function or default to edge.weight
  const getWeight = weightFn || ((edge) => {
    // Add null/undefined safety
    if (!edge || typeof edge.weight !== 'number') {
      return Infinity;
    }
    return edge.weight;
  });
  
  // Initialize data structures for Dijkstra's algorithm
  const distances = {}; // Track shortest distance from start to each node
  const previous = {}; // Track previous node in optimal path
  const edgesUsed = {}; // Track edges used in optimal path
  
  // Use Map instead of Set for better performance with frequent lookups
  const unvisited = new Map(); 
  
  // Initialize distances to Infinity for all nodes except start node
  Object.keys(graph.nodes).forEach(nodeId => {
    const distance = nodeId === startId ? 0 : Infinity;
    distances[nodeId] = distance;
    unvisited.set(nodeId, distance);
  });
  
  // Process nodes until we've visited all or found our target
  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance more efficiently
    let current = null;
    let smallestDistance = Infinity;
    
    for (const [nodeId, distance] of unvisited) {
      if (distance < smallestDistance) {
        smallestDistance = distance;
        current = nodeId;
      }
    }
    
    // If smallest distance is Infinity, there is no path
    if (smallestDistance === Infinity || current === null) {
      break;
    }
    
    // If we've reached our target, we're done
    if (current === endId) {
      break;
    }
    
    // Remove current node from unvisited map
    unvisited.delete(current);
    
    // Get all neighboring edges for current node
    const edges = /** @type {GraphEdge[]} */ (graph.adjacencyList[current] || []);
    
    // Process each edge/neighbor
    for (const edge of edges) {
      // Type check and cast edge properties
      const neighbor = /** @type {string} */ (edge.target);
      
      // Add more thorough validation
      if (typeof neighbor !== 'string' || !graph.nodes[neighbor]) {
        continue; // Skip invalid edges
      }
      
      // Skip if neighbor has already been visited
      if (!unvisited.has(neighbor)) {
        continue;
      }
      
      try {
        // Calculate new distance
        const weight = getWeight(edge);
        
        // Add division by zero protection
        if (typeof weight !== 'number' || isNaN(weight) || weight <= 0) {
          throw new TypeError(`Invalid edge weight: ${weight}. Must be a positive number.`);
        }
        
        const distance = distances[current] + weight;
        
        // If this path is shorter, update distance and previous node
        if (distance < distances[neighbor]) {
          distances[neighbor] = distance;
          previous[neighbor] = current;
          edgesUsed[neighbor] = edge;
          unvisited.set(neighbor, distance); // Update priority in unvisited
        }
      } catch (error) {
        console.error(`Error processing edge from ${current} to ${neighbor}:`, error);
        // Continue processing other edges
      }
    }
  }
  
  // If end node is unreachable
  if (distances[endId] === Infinity) {
    return null;
  }
  
  // Reconstruct the path
  const path = [];
  const pathEdges = [];
  let current = endId;
  
  // Add infinite loop protection
  const maxIterations = Object.keys(graph.nodes).length;
  let iterations = 0;
  
  while (current !== startId && iterations < maxIterations) {
    path.unshift(current);
    if (edgesUsed[current]) {
      pathEdges.unshift(edgesUsed[current]);
    }
    current = previous[current];
    iterations++;
    
    // Safety check
    if (!current) {
      console.error('Path reconstruction failed: missing link in path');
      return null;
    }
  }
  
  path.unshift(startId);
  
  // Return result with proper type casting
  return /** @type {ShortestPathResult} */ ({
    path,
    distance: distances[endId],
    edges: pathEdges
  });
}

/**
 * Creates a network graph from blockchain networks and gateways
 * 
 * @param {Object[]} networks - Array of blockchain network objects
 * @param {Object[]} gateways - Array of gateway objects
 * @returns {Graph} The constructed graph
 */
export function createNetworkGraph(networks, gateways) {
  // Add validation for inputs
  if (!Array.isArray(networks)) {
    throw new TypeError('Networks must be an array');
  }
  
  if (!Array.isArray(gateways)) {
    throw new TypeError('Gateways must be an array');
  }
  
  /** @type {Graph} */
  const graph = {
    nodes: {},
    adjacencyList: {}
  };
  
  // Add networks as nodes
  for (const network of networks) {
    // Add null safety
    if (!network) continue;
    
    const networkId = /** @type {string} */ (network.id || network.name);
    
    // Skip invalid networks
    if (!networkId) {
      console.warn('Skipping network with missing ID and name');
      continue;
    }
    
    graph.nodes[networkId] = {
      id: networkId,
      name: network.name || networkId,
      type: 'blockchain',
      metadata: { ...network }
    };
    
    graph.adjacencyList[networkId] = [];
  }
  
  // Process gateways to create edges
  for (const gateway of gateways) {
    // Each gateway creates bidirectional edges between supported networks
    const supportedNetworks = /** @type {string[]} */ (gateway.supportedNetworks || []);
    const edgeType = gateway.type || 'bridge';
    
    // Create edges between all supported networks through this gateway
    for (let i = 0; i < supportedNetworks.length; i++) {
      const source = supportedNetworks[i];
      
      // Ensure source node exists
      if (!graph.nodes[source]) {
        continue;
      }
      
      for (let j = 0; j < supportedNetworks.length; j++) {
        if (i === j) continue; // Skip self-loops
        
        const target = supportedNetworks[j];
        
        // Ensure target node exists
        if (!graph.nodes[target]) {
          continue;
        }
        
        // Calculate weight based on gateway properties
        let weight = 1;
        if (typeof gateway.speed === 'number') {
          // Faster gateways = lower weight
          weight = 10 / gateway.speed;
        }
        
        // Add security factor
        if (typeof gateway.security === 'number') {
          // More secure gateways are preferred
          weight *= (10 - gateway.security) / 10;
        }
        
        // Add fee factor
        if (typeof gateway.fee === 'number') {
          // Higher fees = higher weight
          weight *= (1 + gateway.fee / 100);
        }
        
        // Create edge
        const edge = {
          source,
          target,
          weight,
          type: edgeType,
          metadata: {
            gatewayId: gateway.id,
            gatewayName: gateway.name,
            security: gateway.security,
            speed: gateway.speed,
            fee: gateway.fee
          }
        };
        
        // Add to adjacency list
        graph.adjacencyList[source].push(edge);
      }
    }
  }
  
  return graph;
}

/**
 * Find the optimal cross-chain path between two blockchain networks
 * 
 * @param {Object[]} networks - Available blockchain networks
 * @param {Object[]} gateways - Available gateway bridges
 * @param {string} sourceNetwork - Source blockchain network ID
 * @param {string} targetNetwork - Target blockchain network ID
 * @param {Object} [options] - Options for path finding
 * @param {string} [options.optimize='balanced'] - What to optimize for: 'speed', 'security', 'cost', or 'balanced'
 * @returns {ShortestPathResult|null} The optimal path or null if no path exists
 */
export function findOptimalCrossChainPath(networks, gateways, sourceNetwork, targetNetwork, options = {}) {
  // Create network graph
  const graph = createNetworkGraph(networks, gateways);
  
  // Create weight function based on optimization parameter
  const optimize = options.optimize || 'balanced';
  let weightFn;
  
  switch (optimize) {
    case 'speed':
      weightFn = (edge) => {
        // Prioritize speed
        const speed = edge.metadata?.speed || 1;
        return 10 / speed;
      };
      break;
      
    case 'security':
      weightFn = (edge) => {
        // Prioritize security
        const security = edge.metadata?.security || 1;
        return (10 - security) + 1; // Invert so higher security = lower weight
      };
      break;
      
    case 'cost':
      weightFn = (edge) => {
        // Prioritize low fees
        const fee = edge.metadata?.fee || 1;
        return fee + 0.1; // Add small constant to avoid zero weights
      };
      break;
      
    case 'balanced':
    default:
      weightFn = (edge) => {
        // Balance all factors
        const speed = edge.metadata?.speed || 1;
        const security = edge.metadata?.security || 1;
        const fee = edge.metadata?.fee || 1;
        
        return (10 / speed) * ((10 - security) / 10 + 0.1) * (fee / 10 + 0.5);
      };
  }
  
  // Find the shortest path
  return findShortestPath(graph, sourceNetwork, targetNetwork, weightFn);
}

export default {
  findShortestPath,
  createNetworkGraph,
  findOptimalCrossChainPath
};

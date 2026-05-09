/**
 * Node registry for the vAIb Sacred Prototype.
 * Tracks all known nodes in the signal space and their liveness.
 *
 * @module NodeRegistry
 */

/** @typedef {import('./NodeIdentity.js').NodeIdentity} NodeIdentity */

/**
 * @typedef {Object} RegisteredNode
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} state
 * @property {number} lastSeen - Timestamp in ms
 * @property {boolean} isLeader
 */

/**
 * Create a node registry.
 *
 * @returns {NodeRegistryAPI} The registry API
 */
export function createNodeRegistry() {
  /** @type {Map<string, RegisteredNode>} */
  const nodes = new Map();
  /** @type {RegisteredNode | null} */
  let selfNode = null;
  /** @type {Set<Function>} */
  const listeners = new Set();

  const notify = () => {
    listeners.forEach((cb) => cb());
  };

  return {
    /**
     * Add or update a node in the registry.
     * @param {RegisteredNode | NodeIdentity} node
     */
    addNode: (node) => {
      const now = Date.now();
      const existing = nodes.get(node.id);
      nodes.set(node.id, {
        ...existing,
        ...node,
        lastSeen: node.lastSeen || now,
        state: node.state || 'ACTIVE',
        isLeader: node.isLeader || false,
      });
      notify();
    },

    /**
     * Remove a node from the registry.
     * @param {string} nodeId
     */
    removeNode: (nodeId) => {
      if (nodes.delete(nodeId)) {
        notify();
      }
    },

    /**
     * Get a single node by id.
     * @param {string} nodeId
     * @returns {RegisteredNode | undefined}
     */
    getNode: (nodeId) => nodes.get(nodeId),

    /**
     * Get all nodes except self.
     * @returns {RegisteredNode[]}
     */
    getAllNodes: () => {
      const selfId = selfNode?.id;
      return Array.from(nodes.values()).filter((n) => n.id !== selfId);
    },

    /**
     * Count nodes with lastSeen within the last 30 seconds.
     * @returns {number}
     */
    getActiveNodeCount: () => {
      const cutoff = Date.now() - 30000;
      return Array.from(nodes.values()).filter((n) => n.lastSeen > cutoff).length;
    },

    /**
     * Update the lastSeen timestamp for a node.
     * @param {string} nodeId
     */
    markHeartbeat: (nodeId) => {
      const node = nodes.get(nodeId);
      if (node) {
        node.lastSeen = Date.now();
      } else {
        nodes.set(nodeId, {
          id: nodeId,
          name: 'unknown',
          type: 'browser',
          state: 'ACTIVE',
          lastSeen: Date.now(),
          isLeader: false,
        });
      }
      notify();
    },

    /**
     * Set the local (self) node.
     * @param {RegisteredNode | NodeIdentity} node
     */
    setSelf: (node) => {
      selfNode = {
        id: node.id,
        name: node.name,
        type: node.type,
        state: 'ACTIVE',
        lastSeen: Date.now(),
        isLeader: false,
      };
      nodes.set(node.id, selfNode);
      notify();
    },

    /**
     * Get the local node.
     * @returns {RegisteredNode | null}
     */
    getSelf: () => selfNode,

    /**
     * Register a change listener.
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    onChange: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}

/**
 * @typedef {Object} NodeRegistryAPI
 * @property {(node: RegisteredNode | NodeIdentity) => void} addNode
 * @property {(nodeId: string) => void} removeNode
 * @property {(nodeId: string) => RegisteredNode | undefined} getNode
 * @property {() => RegisteredNode[]} getAllNodes
 * @property {() => number} getActiveNodeCount
 * @property {(nodeId: string) => void} markHeartbeat
 * @property {(node: RegisteredNode | NodeIdentity) => void} setSelf
 * @property {() => RegisteredNode | null} getSelf
 * @property {(callback: Function) => (() => void)} onChange
 */

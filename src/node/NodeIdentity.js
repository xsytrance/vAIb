/**
 * Node identity management for the vAIb Sacred Prototype.
 * Each node (browser tab, desktop app, mobile client) has a unique identity
 * that persists for the session and determines its role in the network.
 *
 * @module NodeIdentity
 */

/**
 * Generate a pseudo-random node identifier.
 * Format: node_<8-char base36 string>
 *
 * @returns {string} A unique node id
 */
export const generateId = () => 'node_' + Math.random().toString(36).slice(2, 10);

/**
 * Create a node identity object.
 *
 * @param {Object} [options={}] - Identity options
 * @param {string} [options.id] - Override the generated id
 * @param {string} [options.name] - Human-readable node name
 * @param {string} [options.type] - Device type: 'desktop' | 'mobile' | 'tablet' | 'browser'
 * @param {string[]} [options.capabilities] - Feature flags this node supports
 * @returns {NodeIdentity} The created identity
 */
export const createNodeIdentity = (options = {}) => ({
  id: options.id || generateId(),
  name: options.name || 'node',
  type: options.type || 'browser',
  capabilities: options.capabilities || ['playback', 'visual'],
});

/**
 * @typedef {Object} NodeIdentity
 * @property {string} id - Unique node identifier
 * @property {string} name - Human-readable name
 * @property {string} type - Device category
 * @property {string[]} capabilities - Supported feature flags
 */

/**
 * Leader election logic for the vAIb Sacred Prototype.
 * Implements a simplified bully algorithm: on heartbeat timeout a node
 * becomes a candidate, broadcasts its capability score, and either steps
 * down when a higher-scored node responds or declares itself leader.
 *
 * @module LeaderElection
 */

import { MessageTypes } from '../network/MessageTypes.js';

const JITTER_MIN_MS = 100;
const JITTER_MAX_MS = 500;
const ELECT_RESPONSE_WAIT_MS = 1000;

/** @type {Object<string, number>} */
const TYPE_WEIGHT = {
  desktop: 3,
  tablet: 2,
  mobile: 1,
  browser: 1,
};

/**
 * Create the leader election module.
 *
 * @param {import('../node/NodeRegistry.js').NodeRegistryAPI} nodeRegistry
 * @param {import('./LeaderState.js').LeaderStateAPI} leaderState
 * @param {import('../network/SignalClient.js').SignalClientAPI} signalClient
 * @returns {LeaderElectionAPI} The election API
 */
export function createLeaderElection(nodeRegistry, leaderState, signalClient) {
  /** @type {ReturnType<setTimeout> | null} */
  let responseTimer = null;
  /** @type {ReturnType<setTimeout> | null} */
  let jitterTimer = null;
  /** @type {boolean} */
  let awaitingResponse = false;
  /** @type {number} */
  let startTime = Date.now();

  const clearTimers = () => {
    if (responseTimer) clearTimeout(responseTimer);
    if (jitterTimer) clearTimeout(jitterTimer);
    responseTimer = null;
    jitterTimer = null;
    awaitingResponse = false;
  };

  /**
   * Compute a capability score for a node.
   * Higher score = more capable of being leader.
   *
   * @param {string} nodeId
   * @returns {number} Capability score
   */
  const getCapabilityScore = (nodeId) => {
    const node = nodeRegistry.getNode(nodeId) || nodeRegistry.getSelf();
    if (!node) return 0;

    const uptimeSeconds = (Date.now() - startTime) / 1000;
    const type = node.type || 'browser';
    const weight = TYPE_WEIGHT[type] || 1;
    const idSuffix = parseInt(node.id.slice(-3), 36) || 0;

    return uptimeSeconds + (weight * 100) + idSuffix;
  };

  const broadcast = (msg) => {
    signalClient.send(msg);
  };

  const declareLeader = () => {
    const self = nodeRegistry.getSelf();
    if (!self) return;
    leaderState.becomeLeader();
    broadcast({
      type: MessageTypes.LEADER_CONFIRM,
      leaderId: self.id,
      timestamp: Date.now(),
    });
    // Mark self as leader in registry
    const me = nodeRegistry.getNode(self.id);
    if (me) {
      me.isLeader = true;
      nodeRegistry.addNode(me);
    }
  };

  return {
    getCapabilityScore,

    startElection: () => {
      if (awaitingResponse) return; // Election already in progress

      leaderState.becomeCandidate();
      clearTimers();
      awaitingResponse = true;

      const jitter = JITTER_MIN_MS + Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS);
      jitterTimer = setTimeout(() => {
        jitterTimer = null;

        const self = nodeRegistry.getSelf();
        if (!self) return;

        const score = getCapabilityScore(self.id);
        broadcast({
          type: MessageTypes.LEADER_ELECT,
          nodeId: self.id,
          score,
          timestamp: Date.now(),
        });

        responseTimer = setTimeout(() => {
          responseTimer = null;
          awaitingResponse = false;
          // No higher candidate responded — we are leader
          if (leaderState.getState() === 'CANDIDATE') {
            declareLeader();
          }
        }, ELECT_RESPONSE_WAIT_MS);
      }, jitter);
    },

    handleElectionMessage: (msg) => {
      const self = nodeRegistry.getSelf();
      if (!self) return;

      if (msg.type === MessageTypes.LEADER_ELECT) {
        const myScore = getCapabilityScore(self.id);
        const theirScore = msg.score || 0;

        if (theirScore > myScore) {
          // They outrank us — become follower
          clearTimers();
          leaderState.becomeFollower(msg.nodeId);
        } else if (msg.nodeId !== self.id) {
          // We outrank them — send our score back so they step down
          broadcast({
            type: MessageTypes.LEADER_ELECT,
            nodeId: self.id,
            score: myScore,
            timestamp: Date.now(),
          });
        }
      } else if (msg.type === MessageTypes.LEADER_CONFIRM) {
        clearTimers();
        if (msg.leaderId === self.id) {
          leaderState.becomeLeader();
        } else {
          leaderState.becomeFollower(msg.leaderId);
          // Update registry: mark the leader
          const leader = nodeRegistry.getNode(msg.leaderId);
          if (leader) {
            leader.isLeader = true;
            nodeRegistry.addNode(leader);
          }
          // Demote self if needed
          const me = nodeRegistry.getNode(self.id);
          if (me) {
            me.isLeader = false;
            nodeRegistry.addNode(me);
          }
        }
      }
    },
  };
}

/**
 * @typedef {Object} LeaderElectionAPI
 * @property {() => void} startElection
 * @property {(msg: any) => void} handleElectionMessage
 * @property {(nodeId: string) => number} getCapabilityScore
 */

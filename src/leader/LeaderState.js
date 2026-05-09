/**
 * Leader state machine for vAIb Sacred Prototype.
 * Manages the transitions between SOLO, FOLLOWER, CANDIDATE, and LEADER states.
 *
 * @module LeaderState
 */

/**
 * Valid states in the leader election lifecycle.
 * @typedef {'FOLLOWER' | 'CANDIDATE' | 'LEADER' | 'SOLO'} LeaderStateValue
 */

/**
 * Create a leader state machine for a node.
 *
 * @param {string} nodeId - The id of the local node
 * @returns {LeaderStateAPI} The leader state API
 */
export function createLeaderState(nodeId) {
  /** @type {LeaderStateValue} */
  let state = 'SOLO';
  /** @type {string | null} */
  let leaderId = null;
  /** @type {Set<Function>} */
  const listeners = new Set();

  const notify = () => {
    listeners.forEach((cb) => cb(state, leaderId));
  };

  return {
    getState: () => state,
    getLeaderId: () => leaderId,

    becomeCandidate: () => {
      state = 'CANDIDATE';
      leaderId = null;
      notify();
    },

    becomeLeader: () => {
      state = 'LEADER';
      leaderId = nodeId;
      notify();
    },

    becomeFollower: (newLeaderId) => {
      state = 'FOLLOWER';
      leaderId = newLeaderId;
      notify();
    },

    becomeSolo: () => {
      state = 'SOLO';
      leaderId = null;
      notify();
    },

    onChange: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}

/**
 * @typedef {Object} LeaderStateAPI
 * @property {() => LeaderStateValue} getState
 * @property {() => string | null} getLeaderId
 * @property {() => void} becomeCandidate
 * @property {() => void} becomeLeader
 * @property {(leaderId: string) => void} becomeFollower
 * @property {() => void} becomeSolo
 * @property {(callback: Function) => (() => void)} onChange
 */

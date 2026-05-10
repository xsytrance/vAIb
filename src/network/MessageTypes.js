/**
 * Message type constants for vAIb Sacred Prototype network protocol.
 * All messages exchanged between nodes use these type identifiers.
 *
 * @module MessageTypes
 */

export const MessageTypes = {
  HELLO: 'HELLO',
  WELCOME: 'WELCOME',
  HEARTBEAT: 'HEARTBEAT',
  HEARTBEAT_TIMEOUT: 'HEARTBEAT_TIMEOUT',
  ATMOSPHERE_SYNC: 'ATMOSPHERE_SYNC',
  STATE_UPDATE: 'STATE_UPDATE',
  LEADER_ELECT: 'LEADER_ELECT',
  LEADER_CONFIRM: 'LEADER_CONFIRM',
  GOODBYE: 'GOODBYE',
  // Relay-pushed discovery data — backend is sole authority
  DISCOVERY_RESULT: 'DISCOVERY_RESULT',
};

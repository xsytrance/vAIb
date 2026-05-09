/**
 * AtmosphereProvider — React context that ties together all vAIb systems.
 *
 * This is the main integration point: it creates the node identity,
 * node registry, leader state, resonance engine, signal client, and
 * leader election, then exposes derived values (RI, parameters, node list,
 * connection state) to the rest of the application.
 *
 * @module AtmosphereProvider
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createSignalClient } from '../network/SignalClient.js';
import { createNodeRegistry } from '../node/NodeRegistry.js';
import { createNodeIdentity } from '../node/NodeIdentity.js';
import { createLeaderState } from '../leader/LeaderState.js';
import { createLeaderElection } from '../leader/LeaderElection.js';
import { createResonanceEngine } from './ResonanceEngine.js';
import { mapRIToParameters } from './AtmosphereParameters.js';
import { MessageTypes } from '../network/MessageTypes.js';

const AtmosphereContext = createContext(null);

/**
 * Hook to access the atmosphere context.
 * @returns {AtmosphereContextValue}
 */
export const useAtmosphere = () => useContext(AtmosphereContext);

/**
 * Provides atmosphere state to descendant components.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Object} [props.nodeOptions={}] - Options passed to createNodeIdentity
 */
export function AtmosphereProvider({ children, nodeOptions = {} }) {
  // --- Exposed React state ---
  const [ri, setRi] = useState(0.7);
  const [parameters, setParameters] = useState(() => mapRIToParameters(0.7, true));
  const [isLeader, setIsLeader] = useState(true);
  const [leaderId, setLeaderId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');

  // --- Mutable system references (do not trigger re-renders) ---
  const systemsRef = useRef({});
  const isInitRef = useRef(false);

  // --- One-time system initialisation ---
  useEffect(() => {
    if (isInitRef.current) return;
    isInitRef.current = true;

    const myNode = createNodeIdentity(nodeOptions);
    const registry = createNodeRegistry();
    registry.setSelf(myNode);

    const leaderState = createLeaderState(myNode.id);
    const engine = createResonanceEngine();
    const client = createSignalClient();
    const election = createLeaderElection(registry, leaderState, client);

    systemsRef.current = {
      myNode,
      registry,
      leaderState,
      engine,
      client,
      election,
    };

    // Update RI + parameters whenever the engine reports a change
    engine.onChange((newRI) => {
      setRi(newRI);
      const activeCount = registry.getActiveNodeCount();
      const isSolo = activeCount === 0;
      setParameters(mapRIToParameters(newRI, isSolo));
    });

    // Initial RI computation (solo)
    engine.computeRI(1);

    // Sync React state with leader state changes
    leaderState.onChange((state, lid) => {
      setIsLeader(state === 'LEADER' || state === 'SOLO');
      setLeaderId(lid);
    });

    return () => {
      client.disconnect();
      engine.stop();
      isInitRef.current = false;
    };
  }, []);

  // --- Connect to a signal server ---
  const connect = useCallback((url) => {
    const sys = systemsRef.current;
    if (!sys || !sys.client) return;

    const { client, registry, leaderState, engine, election, myNode } = sys;

    // Avoid double-connecting
    if (client.isConnected() || client.getConnectionState() === 'connecting') return;

    client.onMessage((msg) => {
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case MessageTypes.HELLO: {
          // Another node joined — add to registry
          if (msg.nodeId && msg.nodeId !== myNode.id) {
            registry.addNode({
              id: msg.nodeId,
              name: msg.name || msg.nodeId,
              type: msg.nodeType || 'browser',
              state: 'ACTIVE',
              lastSeen: Date.now(),
            });
            // If we are leader, send WELCOME back (broadcast via relay)
            if (leaderState.getState() === 'LEADER') {
              client.send({
                type: MessageTypes.WELCOME,
                leaderId: myNode.id,
                nodes: [myNode, ...registry.getAllNodes()],
                timestamp: Date.now(),
              });
            }
          }
          break;
        }

        case MessageTypes.WELCOME: {
          if (msg.nodes) {
            msg.nodes.forEach((n) => {
              if (n.id !== myNode.id) registry.addNode(n);
            });
          }
          if (msg.leaderId && msg.leaderId !== myNode.id) {
            leaderState.becomeFollower(msg.leaderId);
            setLeaderId(msg.leaderId);
          }
          setConnected(true);
          setConnectionState('connected');
          break;
        }

        case MessageTypes.HEARTBEAT: {
          if (msg.nodeId && msg.nodeId !== myNode.id) registry.markHeartbeat(msg.nodeId);
          break;
        }

        case MessageTypes.HEARTBEAT_TIMEOUT: {
          election.startElection();
          break;
        }

        case MessageTypes.ATMOSPHERE_SYNC: {
          if (msg.ri !== undefined) {
            engine.forceRI(msg.ri);
          }
          break;
        }

        case MessageTypes.LEADER_ELECT: {
          election.handleElectionMessage(msg);
          break;
        }

        case MessageTypes.LEADER_CONFIRM: {
          if (msg.leaderId === myNode.id) {
            leaderState.becomeLeader();
            setIsLeader(true);
          } else {
            leaderState.becomeFollower(msg.leaderId);
            setIsLeader(false);
          }
          setLeaderId(msg.leaderId);
          break;
        }

        case MessageTypes.STATE_UPDATE: {
          if (msg.nodeId && msg.state) {
            const node = registry.getNode(msg.nodeId);
            if (node) {
              node.state = msg.state;
              registry.addNode(node);
            }
          }
          break;
        }

        case MessageTypes.GOODBYE: {
          if (msg.nodeId) registry.removeNode(msg.nodeId);
          break;
        }

        default:
          break;
      }

      // Keep node list and RI in sync
      setNodes(registry.getAllNodes());
      const activeCount = registry.getActiveNodeCount() + 1; // +1 for self
      engine.computeRI(activeCount);
    });

    client.onDisconnect(() => {
      setConnected(false);
      setConnectionState('disconnected');
      leaderState.becomeSolo();
      setIsLeader(true);
      setLeaderId(null);
      registry.getAllNodes().forEach((n) => registry.removeNode(n.id));
      setNodes([]);
      engine.computeRI(1); // solo
    });

    client.connect(url, myNode.id);
    setConnectionState('connecting');
  }, []);

  // --- Disconnect from signal server ---
  const disconnect = useCallback(() => {
    const { client } = systemsRef.current || {};
    if (client) client.disconnect();
  }, []);

  // --- Leader: broadcast atmosphere sync every 30s ---
  useEffect(() => {
    if (!isLeader || !connected) return;

    const interval = setInterval(() => {
      const { client, engine } = systemsRef.current || {};
      if (client && engine) {
        client.send({
          type: MessageTypes.ATMOSPHERE_SYNC,
          ri: engine.getSmoothedRI(),
          timestamp: Date.now(),
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLeader, connected]);

  const myNode = systemsRef.current.myNode || { id: '?', name: 'node', type: 'browser' };

  return (
    <AtmosphereContext.Provider
      value={{
        ri,
        parameters,
        isLeader,
        leaderId,
        nodes,
        myNode,
        connected,
        connectionState,
        connect,
        disconnect,
      }}
    >
      {children}
    </AtmosphereContext.Provider>
  );
}

/**
 * @typedef {Object} AtmosphereContextValue
 * @property {number} ri                       Current smoothed Resonance Integrity
 * @property {import('./AtmosphereParameters.js').AtmosphereParameters} parameters
 * @property {boolean} isLeader                Whether this node is the leader
 * @property {string | null} leaderId          Id of current leader
 * @property {import('../node/NodeRegistry.js').RegisteredNode[]} nodes  Other known nodes
 * @property {import('../node/NodeIdentity.js').NodeIdentity} myNode     This node's identity
 * @property {boolean} connected               WebSocket connected
 * @property {string} connectionState          'disconnected' | 'connecting' | 'connected'
 * @property {(url: string) => void} connect   Connect to signal server
 * @property {() => void} disconnect           Disconnect from signal server
 */

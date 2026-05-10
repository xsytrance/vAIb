// ============================================================
// AgentProvider — React context that wires the agent system.
//
// Exposes: agent, currentSignal, agentMood, isPlaying, toast,
// plus actions: tuneIn, mute, shiftSignal, holdSignal,
// markResonant, markStatic.
//
// The agent selects signals. The human tunes in.
//
// BACKEND IS SOLE AUTHORITY:
//   - Discovery runs on Node.js backend (server/discovery.mjs)
//   - Relay pushes DISCOVERY_RESULT via WebSocket
//   - This module is a PURE CONSUMER — never scans, never fabricates
//   - If no discovery data: station is quiet. Truth > immersion.
// ============================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAtmosphere } from '../atmosphere/AtmosphereProvider';
import { createSaito, getSaitoRotation, evolveSaitoMood } from './Saito';
import { selectNextSignal, interpretShiftRequest, applyFeedback, updateAttachment, getAttachment } from './AgentState';
import { deriveSignalFromAgent, getGhostMode } from './StationDiscovery';
import { toastMessages, pickToast } from './ToastLanguage';
import { SignalEngine } from '../audio/SignalEngine';

const AgentContext = createContext(null);

export const useAgent = () => useContext(AgentContext);

export function AgentProvider({ children }) {
  // ---- Backend discovery data (sole authority) ----
  const { discovery } = useAtmosphere();

  const saitoRef = useRef(null);

  const [currentSignal, setCurrentSignal] = useState(null);
  const [agentMood, setAgentMood] = useState('neutral');
  const [isPlaying, setIsPlaying] = useState(false);
  const [toast, setToast] = useState(null);

  // ---- Station composition from backend discovery ----
  const [station, setStation] = useState({
    dominant: null,
    active: [],
    ghost: [],
    stationMood: 'neutral',
    agentCount: 0,
    source: 'waiting', // 'waiting' | 'relay' | 'quiet'
  });

  // ---- Toast helper ----
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ---- Compose station from backend discovery data ----
  useEffect(() => {
    if (!discovery || discovery.source === 'waiting') {
      // Still waiting for first DISCOVERY_RESULT from relay
      console.log('[TEMP][AgentProvider] Waiting for DISCOVERY_RESULT from relay...');
      return;
    }

    if (discovery.source === 'relay') {
      console.log('[TEMP][AgentProvider] DISCOVERY_RESULT received — agents=' + discovery.agents.length + ', dominant=' + (discovery.dominant || 'none'));

      const agents = discovery.agents || [];
      const active = agents.filter(a => (a.presenceScore || 0) >= 0.3);
      const ghost = agents.filter(a => {
        const s = a.presenceScore || 0;
        return s > 0 && s < 0.3;
      });
      const dominant = discovery.dominant || null;

      // Derive station mood from dominant agent type
      const domAgent = agents.find(a => a.id === dominant);
      const stationMood = domAgent
        ? domAgent.type === 'command' ? 'focused'
          : domAgent.type === 'field' ? 'reflective'
          : 'neutral'
        : 'neutral';

      // Add ghost mode labels to agents for UI rendering
      const activeWithGhost = active.map(a => ({
        ...a,
        ghostMode: getGhostMode(a.presenceScore || 0),
        derivedSignal: deriveSignalFromAgent(a),
      }));
      const ghostWithMode = ghost.map(a => ({
        ...a,
        ghostMode: getGhostMode(a.presenceScore || 0),
        derivedSignal: deriveSignalFromAgent(a),
      }));

      setStation({
        dominant,
        active: activeWithGhost,
        ghost: ghostWithMode,
        stationMood,
        agentCount: agents.length,
        source: 'relay',
      });

      console.log('[TEMP][AgentProvider] Station composed — active=' + active.length + ', ghost=' + ghost.length + ', mood=' + stationMood);
    }
  }, [discovery]);

  // ---- Initialize Saito (signal agent) once station is known ----
  useEffect(() => {
    // Only initialize once
    if (saitoRef.current) return;

    const saito = createSaito();

    // If we have discovery data with a dominant agent, reflect its character
    if (station.source === 'relay' && station.dominant) {
      const domAgent = station.active.find(a => a.id === station.dominant);
      if (domAgent) {
        console.log('[TEMP][AgentProvider] Configuring Saito from dominant agent: ' + domAgent.name);
        saito.id = domAgent.id;
        saito.name = domAgent.name;
        saito.type = domAgent.type;
        saito.presenceScore = domAgent.presenceScore || 0.8;

        // Derive taste from real agent behavior
        const derived = deriveSignalFromAgent(domAgent);
        saito.taste = {
          energy: derived.energy,
          noise: derived.noise,
          warmth: derived.warmth,
          complexity: derived.complexity,
          pace: derived.pace,
        };
      }
    } else {
      // No discovery data yet — Saito uses defaults
      // NO synthetic agent fabrication. Saito is the signal controller,
      // not a fake discovered agent. The station simply shows "quiet".
      console.log('[TEMP][AgentProvider] No discovery data — Saito using default configuration');
    }

    // Build rotation
    saito.rotation = getSaitoRotation();

    const firstSignal = selectNextSignal(saito);
    saito.currentSignal = firstSignal;
    saito.lastSignalChangeAt = Date.now();
    saito.signalsPlayed = 1;
    if (firstSignal?.id) {
      saito.signalHistory.push(firstSignal.id);
    }

    saitoRef.current = saito;
    setCurrentSignal(firstSignal);
    setAgentMood(saito.currentMood);
    showToast(pickToast(toastMessages.signalSelected, saito, firstSignal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station.source, station.dominant]);

  // ---- Timeout: if no DISCOVERY_RESULT within 5s, mark as quiet ----
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!station.source || station.source === 'waiting') {
        console.log('[TEMP][AgentProvider] Discovery timeout — marking station quiet');
        setStation(prev => ({
          ...prev,
          source: 'quiet',
          dominant: null,
          active: [],
          ghost: [],
          stationMood: 'neutral',
        }));
      }
    }, 5000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- "Tune In" — human starts listening to the agent's stream ----
  const tuneIn = useCallback(() => {
    const saito = saitoRef.current;
    if (!saito || !saito.currentSignal) return;

    setIsPlaying(true);

    // Start the signal engine
    SignalEngine.init();
    SignalEngine.tuneIn(saito.currentSignal, saito.currentMood);

    // Sparse toast ritual — quiet, rare
    const toasts = [
      { delay: 5000,  msg: saito.name + ' opened the channel.' },
      { delay: 20000, msg: 'Signal stabilizing.' },
      { delay: 45000, msg: saito.name + ' is listening.' },
    ];

    toasts.forEach(({ delay, msg }) => {
      setTimeout(() => {
        if (saitoRef.current) showToast(msg);
      }, delay);
    });
  }, [showToast]);

  // ---- "Mute" — human stops local audio ----
  const mute = useCallback(() => {
    setIsPlaying(false);
    SignalEngine.mute();
  }, []);

  // ---- "Shift Signal" — human nudges; agent interprets ----
  const shiftSignal = useCallback(() => {
    const saito = saitoRef.current;
    if (!saito) return;

    // Update attachment to current signal before leaving
    updateAttachment(saito);

    // 20% chance: agent ignores shift if attachment > 0.5
    const currentAttachment = getAttachment(saito, saito.currentSignal?.id);
    if (currentAttachment > 0.5 && Math.random() < 0.2) {
      showToast(saito.name + ' is still exploring this signal.');
      return;
    }

    const { signal, reason } = interpretShiftRequest(saito);
    if (!signal) return;

    saito.currentSignal = signal;
    saito.lastSignalChangeAt = Date.now();
    saito.signalsPlayed += 1;
    saito.signalHistory.push(signal.id);

    // Trim history to last 20
    if (saito.signalHistory.length > 20) {
      saito.signalHistory = saito.signalHistory.slice(-20);
    }

    // Evolve mood organically
    saito.currentMood = evolveSaitoMood(saito);

    setCurrentSignal(signal);
    setAgentMood(saito.currentMood);
    showToast(reason);
  }, [showToast]);

  // ---- "Hold Signal" — human wants to revisit / hold ----
  const holdSignal = useCallback(() => {
    const saito = saitoRef.current;
    if (!saito || !saito.currentSignal) return;
    showToast(
      pickToast(toastMessages.signalHeld, saito, saito.currentSignal)
    );
  }, [showToast]);

  // ---- "Mark Resonant" — positive feedback ----
  const markResonant = useCallback(() => {
    const saito = saitoRef.current;
    if (!saito || !saito.currentSignal) return;
    applyFeedback(saito, saito.currentSignal.id, 'resonant');
    showToast(
      pickToast(toastMessages.feedbackAcknowledged, saito, 'resonant')
    );
  }, [showToast]);

  // ---- "Mark Static" — negative feedback ----
  const markStatic = useCallback(() => {
    const saito = saitoRef.current;
    if (!saito || !saito.currentSignal) return;
    applyFeedback(saito, saito.currentSignal.id, 'static');
    showToast(
      pickToast(toastMessages.feedbackAcknowledged, saito, 'static')
    );
  }, [showToast]);

  return (
    <AgentContext.Provider
      value={{
        agent:          saitoRef.current,
        station,        // composed from backend DISCOVERY_RESULT
        currentSignal,
        agentMood,
        isPlaying,
        toast,
        tuneIn,
        mute,
        shiftSignal,
        holdSignal,
        markResonant,
        markStatic,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

// ============================================================
// AgentProvider — React context that wires the agent system.
//
// Exposes: agent, currentSignal, agentMood, isPlaying, toast,
// plus actions: tuneIn, mute, shiftSignal, holdSignal,
// markResonant, markStatic.
//
// The agent selects signals. The human tunes in.
// ============================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createSaito, getSaitoRotation, evolveSaitoMood } from './Saito';
import { selectNextSignal, interpretShiftRequest, applyFeedback, updateAttachment, getAttachment, getSessionPhase } from './AgentState';
import { toastMessages, pickToast } from './ToastLanguage';
import { SignalEngine } from '../audio/SignalEngine';

const AgentContext = createContext(null);

export const useAgent = () => useContext(AgentContext);

export function AgentProvider({ children }) {
  const saitoRef = useRef(null);

  const [currentSignal, setCurrentSignal] = useState(null);
  const [agentMood, setAgentMood] = useState('neutral');
  const [isPlaying, setIsPlaying] = useState(false);
  const [toast, setToast] = useState(null);

  // ---- Toast helper ----
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ---- Initialize Saito once ----
  useEffect(() => {
    const saito = createSaito();
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
  }, []);

  // ---- "Tune In" — human starts listening to Saito's stream ----
  const tuneIn = useCallback(() => {
    const saito = saitoRef.current;
    if (!saito || !saito.currentSignal) return;

    setIsPlaying(true);

    // Start the signal engine
    SignalEngine.init();
    SignalEngine.tuneIn(saito.currentSignal, saito.currentMood);

    // Sparse toast ritual — quiet, rare
    const toasts = [
      { delay: 5000,  msg: 'Saito opened the channel.' },
      { delay: 20000, msg: 'Signal stabilizing.' },
      { delay: 45000, msg: 'Saito is listening.' },
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

  // ---- "Shift Signal" — human nudges; Saito interprets ----
  const shiftSignal = useCallback(() => {
    const saito = saitoRef.current;
    if (!saito) return;

    // Update attachment to current signal before leaving
    updateAttachment(saito);

    // 20% chance: Saito ignores shift if attachment > 0.5
    const currentAttachment = getAttachment(saito, saito.currentSignal?.id);
    if (currentAttachment > 0.5 && Math.random() < 0.2) {
      showToast('Saito is still exploring this signal.');
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

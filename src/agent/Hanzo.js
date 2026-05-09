import { createAgentState, AgentMood } from './AgentState'

export const createHanzo = () => createAgentState({
  id: 'hanzo',
  name: 'Hanzo',
  type: 'field',
  defaultStation: 'field',
})

export const getHanzoRotation = () => [
  { id: 'sig_han_ghost', title: 'Ghost Signal', artist: 'Hanzo', duration: 420, bpm: 60, energy: 0.2, warmth: 0.1, noise: 0.3, complexity: 0.5, tags: ['ghost', 'field', 'silent'], audioSrc: null, whyAgentKeepsIt: 'Hanzo keeps this for the spaces between.' },
  { id: 'sig_han_bloom', title: 'Field Bloom', artist: 'Hanzo', duration: 300, bpm: 90, energy: 0.6, warmth: 0.7, noise: 0.4, complexity: 0.7, tags: ['bloom', 'field', 'warm'], audioSrc: null, whyAgentKeepsIt: 'Hanzo uses this for warmth.' },
]

export const evolveHanzoMood = (agent) => {
  return AgentMood.REFLECTIVE
}

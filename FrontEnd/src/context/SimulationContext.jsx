/**
 * SimulationContext — manages state for the Simulation page only.
 *
 * All game state has been moved to GameContext.
 */

import { createContext, useContext, useMemo, useState } from 'react';

const SimulationContext = createContext(null);

export const SimulationProvider = ({ children }) => {
  const [status, setStatus]         = useState('idle');   // idle | running | stopped
  const [volatility, setVolatility] = useState(0.0);
  const [priceData, setPriceData]   = useState([]);
  const [events, setEvents]         = useState([]);
  const [simulation, setSimulation] = useState(null);

  const startSimulation   = () => setStatus('running');
  const stopSimulation    = () => setStatus('stopped');
  const restartSimulation = () => { setSimulation(null); setStatus('running'); };

  const value = useMemo(
    () => ({
      status, setStatus,
      volatility, setVolatility,
      priceData, setPriceData,
      events, setEvents,
      simulation, setSimulation,
      startSimulation,
      stopSimulation,
      restartSimulation,
    }),
    [status, volatility, priceData, events, simulation],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSimulation = () => {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
};

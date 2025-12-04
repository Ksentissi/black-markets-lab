import { createContext, useContext, useMemo, useState } from 'react';

const SimulationContext = createContext(null);

export const SimulationProvider = ({ children }) => {
  const [status, setStatus] = useState('idle');
  const [volatility, setVolatility] = useState(0.0);
  const [priceData, setPriceData] = useState([]);
  const [events, setEvents] = useState([]);
  const [simulation, setSimulation] = useState(null);

  const startSimulation = () => setStatus('running');
  const stopSimulation = () => setStatus('stopped');
  const restartSimulation = () => {
    setSimulation(null);
    setStatus('running');
  };

  const value = useMemo(
    () => ({
      status,
      volatility,
      priceData,
      events,
      simulation,
      setPriceData,
      setEvents,
      setVolatility,
      setSimulation,
      startSimulation,
      stopSimulation,
      restartSimulation,
      setStatus,
    }),
    [status, volatility, priceData, events, simulation],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};


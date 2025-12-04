import { createContext, useContext, useMemo, useState } from 'react';

const SimulationContext = createContext(null);

export const SimulationProvider = ({ children }) => {
  // Original Simulation State
  const [status, setStatus] = useState('idle');
  const [volatility, setVolatility] = useState(0.0);
  const [priceData, setPriceData] = useState([]);
  const [events, setEvents] = useState([]);
  const [simulation, setSimulation] = useState(null);

  // Game State
  const [gameStatus, setGameStatus] = useState('setup'); // setup, reflection, playing, paused, finished
  const [balance, setBalance] = useState(1000000);
  const [portfolio, setPortfolio] = useState({}); // { "Apple": 10, "Google": -5 }
  const [gameDifficulty, setGameDifficulty] = useState('Medium');
  const [gameData, setGameData] = useState(null); // Holds the simulation data for the game
  const [availableEvents, setAvailableEvents] = useState([]); // Metadata for popups
  
  // Persistent Game Loop State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [activeStock, setActiveStock] = useState(null);
  
  const startSimulation = () => setStatus('running');
  const stopSimulation = () => setStatus('stopped');
  const restartSimulation = () => {
    setSimulation(null);
    setStatus('running');
  };

  // Game Actions
  const startGame = (difficulty, selectedStocksData, initialCapital) => {
    setGameDifficulty(difficulty);
    setGameData(selectedStocksData);
    if (selectedStocksData.events) {
        setAvailableEvents(selectedStocksData.events);
    }
    setBalance(initialCapital || 1000000);
    setPortfolio({});
    setCurrentIndex(0);
    setTimeLeft(180);
    // Start with reflection period
    setGameStatus('reflection');
  };

  const pauseGame = () => {
    if (gameStatus === 'playing' || gameStatus === 'event_popup') {
        setGameStatus('paused');
    }
  };

  const resumeGame = () => {
    if (gameStatus === 'paused' || gameStatus === 'event_popup') {
        setGameStatus('playing');
    }
  };
  
  const skipReflection = () => {
      if (gameStatus === 'reflection') {
          setGameStatus('playing');
      }
  };

  const resetGame = () => {
    setGameStatus('setup');
    setBalance(1000000);
    setPortfolio({});
    setGameData(null);
    setCurrentIndex(0);
    setTimeLeft(180);
    setActiveStock(null);
  };

  const buyStock = (symbol, quantity, price) => {
    const cost = quantity * price;
    if (balance >= cost) {
      setBalance((prev) => prev - cost);
      setPortfolio((prev) => ({
        ...prev,
        [symbol]: (prev[symbol] || 0) + quantity,
      }));
      return true;
    }
    return false;
  };

  const sellStock = (symbol, quantity, price) => {
    const currentQty = portfolio[symbol] || 0;
    if (currentQty >= quantity) {
        const revenue = quantity * price;
        setBalance((prev) => prev + revenue);
        setPortfolio((prev) => ({
            ...prev,
            [symbol]: prev[symbol] - quantity,
        }));
        return true;
    }
    return false;
  };
  
  // Apply Event Impact Logic
  // This modifies the local gameData to reflect the "future" impact
  // Since we pre-calculated the simulation, we can simulate an "event" by 
  // scaling the remaining values of a specific stock series.
  const applyEventImpact = (stockName, impactType, magnitude) => {
      if (!gameData) return;
      
      const currentIdx = currentIndex;
      const seriesIndex = gameData.series.findIndex(s => s.name === stockName);
      
      if (seriesIndex === -1) return;
      
      const newSeries = [...gameData.series];
      const originalValues = [...newSeries[seriesIndex].values];
      
      // Modify all future values from current index
      for (let i = currentIdx; i < originalValues.length; i++) {
          if (impactType === 'positive') {
              originalValues[i] *= magnitude; 
          } else if (impactType === 'negative') {
               originalValues[i] *= magnitude;
          } else if (impactType === 'volatile') {
              // Add noise
              const noise = 1 + (Math.random() * (magnitude - 1) * (Math.random() > 0.5 ? 1 : -1));
              originalValues[i] *= noise;
          }
      }
      
      newSeries[seriesIndex] = {
          ...newSeries[seriesIndex],
          values: originalValues
      };
      
      setGameData({
          ...gameData,
          series: newSeries
      });
  };

  const value = useMemo(
    () => ({
      // Simulation
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
      
      // Game
      gameStatus,
      setGameStatus,
      balance,
      portfolio,
      gameDifficulty,
      gameData,
      availableEvents,
      startGame,
      pauseGame,
      resumeGame,
      resetGame,
      skipReflection,
      buyStock,
      sellStock,
      applyEventImpact,
      
      // Persistent Game Loop State
      currentIndex, 
      setCurrentIndex,
      timeLeft, 
      setTimeLeft,
      activeStock, 
      setActiveStock
    }),
    [
      status, volatility, priceData, events, simulation, 
      gameStatus, balance, portfolio, gameDifficulty, gameData, availableEvents,
      currentIndex, timeLeft, activeStock
    ],
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

import { useState, useEffect, useRef } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { fetchSimulation } from '../services/api';
import Plotly from 'plotly.js-dist-min';

const AVAILABLE_STOCKS = ['Apple', 'Microsoft', 'Google', 'Amazon', 'Facebook', 'Tesla', 'Netflix', 'Nvidia'];

const Game = () => {
  const {
    gameStatus,
    setGameStatus,
    balance,
    portfolio,
    startGame,
    pauseGame,
    resumeGame,
    buyStock,
    sellStock,
    resetGame,
    gameData,
    currentIndex,
    setCurrentIndex,
    timeLeft,
    setTimeLeft,
    activeStock,
    setActiveStock
  } = useSimulation();

  // Setup State
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
  const [numStocks, setNumStocks] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [tradeQty, setTradeQty] = useState(10);
  
  // Reflection State
  const [reflectionTime, setReflectionTime] = useState(30);

  // Animation State
  const [lastAction, setLastAction] = useState(null); // { type: 'buy'|'sell', stock: string, id: number }

  const graphRef = useRef(null);
  const timerRef = useRef(null);
  const loopRef = useRef(null);
  const reflectionTimerRef = useRef(null);

  // Pause when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameStatus === 'playing') pauseGame();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // --- Setup Logic ---
  const handleStart = async () => {
    setIsLoading(true);
    // Pick random stocks
    const shuffled = [...AVAILABLE_STOCKS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numStocks);

    // Fetch simulation
    try {
      // Request more steps for smoother animation (e.g. 2000 steps for 3 mins)
      // 3 mins = 180s. 2000 steps -> ~90ms per step.
      const data = await fetchSimulation(selected, 2000);
      
      // Initialize active stock immediately so Reflection screen has data
      setActiveStock(data.series[0].name);
      
      startGame(selectedDifficulty, data);
    } catch (err) {
      console.error("Failed to start game", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Reflection Loop ---
  useEffect(() => {
    if (gameStatus !== 'reflection') return;

    setReflectionTime(30);
    
    reflectionTimerRef.current = setInterval(() => {
        setReflectionTime((prev) => {
            if (prev <= 1) {
                clearInterval(reflectionTimerRef.current);
                setGameStatus('playing');
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(reflectionTimerRef.current);
  }, [gameStatus, setGameStatus]);

  // --- Game Loop ---
  useEffect(() => {
    if (gameStatus !== 'playing' || !gameData) return;

    // Timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
            setGameStatus('finished');
            return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Simulation Progress
    const totalSteps = gameData.timestamps.length;
    const intervalTime = (180 * 1000) / totalSteps; 

    loopRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= totalSteps - 1) {
          setGameStatus('finished');
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(loopRef.current);
    };
  }, [gameStatus, gameData, setGameStatus, setCurrentIndex, setTimeLeft]);

  // Ref tracking for unmount pause
  const statusRef = useRef(gameStatus);
  useEffect(() => { statusRef.current = gameStatus; }, [gameStatus]);

  useEffect(() => {
      return () => {
          if (statusRef.current === 'playing' || statusRef.current === 'reflection') {
              pauseGame();
          }
      };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // --- Graph Update ---
  useEffect(() => {
    if (!graphRef.current || !gameData || !activeStock) return;

    const series = gameData.series.find(s => s.name === activeStock);
    if (!series) return;

    const currentData = {
      x: gameData.timestamps.slice(0, currentIndex + 1),
      y: series.values.slice(0, currentIndex + 1),
    };

    const trace = {
        x: currentData.x,
        y: currentData.y,
        type: 'scatter',
        mode: 'lines',
        line: { color: '#F97316', width: 2 }, // Orange
        fill: 'tozeroy',
        fillcolor: 'rgba(249, 115, 22, 0.1)',
    };

    const layout = {
      title: false,
      autosize: true,
      margin: { t: 20, r: 20, b: 40, l: 50 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#94a3b8' },
      xaxis: { 
          range: [0, gameData.timestamps[gameData.timestamps.length-1]],
          showgrid: false,
      },
      yaxis: { 
          autorange: true,
          gridcolor: 'rgba(255,255,255,0.05)',
      },
    };

    Plotly.react(graphRef.current, [trace], layout, { displayModeBar: false });

  }, [currentIndex, activeStock, gameData]);


  // --- Actions with Animation ---
  const handleBuy = () => {
      const price = getCurrentPrice(activeStock);
      if (buyStock(activeStock, tradeQty, price)) {
          setLastAction({ type: 'buy', stock: activeStock, id: Date.now() });
          setTimeout(() => setLastAction(null), 1000);
      }
  };

  const handleSell = () => {
      const price = getCurrentPrice(activeStock);
      if (sellStock(activeStock, tradeQty, price)) {
          setLastAction({ type: 'sell', stock: activeStock, id: Date.now() });
          setTimeout(() => setLastAction(null), 1000);
      }
  };


  // --- Helpers ---
  const getCurrentPrice = (symbol) => {
    if (!gameData) return 0;
    const s = gameData.series.find(stock => stock.name === symbol);
    return s ? s.values[currentIndex] : 0;
  };

  const getTotalValue = () => {
    let total = balance;
    if (gameData) {
        Object.entries(portfolio).forEach(([symbol, qty]) => {
            total += qty * getCurrentPrice(symbol);
        });
    }
    return total;
  };

  const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);


  // --- Render: Setup ---
  if (gameStatus === 'setup') {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
          <h2 className="mb-2 text-3xl font-bold text-white">Trading Game</h2>
          <p className="mb-8 text-slate-400">Start with $1,000,000. Can you beat the market?</p>

          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-300">Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {['Easy', 'Medium', 'Hard'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDifficulty(d)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      selectedDifficulty === d
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-300">Number of Stocks</label>
              <div className="grid grid-cols-3 gap-3">
                {[2, 4, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumStocks(n)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      numStocks === n
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {n} Stocks
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={isLoading}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] hover:shadow-orange-500/30 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Start Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Render: Reflection ---
  if (gameStatus === 'reflection') {
      return (
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
            <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-white">Market Analysis</h2>
                    <p className="mt-2 text-slate-400">Review the market conditions before trading begins.</p>
                    <div className="mt-6 text-5xl font-bold text-brand">{reflectionTime}s</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {gameData?.series.map((stock) => (
                        <div key={stock.name} className="rounded-xl border border-white/5 bg-slate-800/50 p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="font-bold text-white">{stock.name}</span>
                                <span className="text-xs text-slate-500">Vol: {stock.volatility.toFixed(2)}</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {formatMoney(stock.values[0])}
                            </div>
                        </div>
                    ))}
                </div>
                
                <p className="mt-8 text-center text-sm text-slate-500 animate-pulse">
                    Game starting soon...
                </p>
            </div>
        </div>
      );
  }

  // --- Render: Finished ---
  if (gameStatus === 'finished') {
    const finalValue = getTotalValue();
    const profit = finalValue - 1000000;
    const isProfit = profit >= 0;

    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-center backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white">Game Over</h2>
          <div className="my-8">
            <p className="text-sm text-slate-400">Final Net Worth</p>
            <p className="text-4xl font-bold text-white">{formatMoney(finalValue)}</p>
            <p className={`mt-2 text-lg font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{formatMoney(profit)}
            </p>
          </div>
          <button
            onClick={resetGame}
            className="w-full rounded-xl bg-brand py-3 font-bold text-white transition hover:bg-brand-dark"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // --- Render: Playing / Paused ---
  const currentPrice = getCurrentPrice(activeStock);
  const currentHolding = portfolio[activeStock] || 0;

  return (
    <div className="relative flex h-[calc(100vh-80px)] flex-col overflow-hidden">
        
      {/* Pause Modal */}
      {gameStatus === 'paused' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-8 text-center shadow-2xl">
                  <h3 className="mb-4 text-2xl font-bold text-white">Game Paused</h3>
                  <p className="mb-8 text-slate-400">Do you want to resume the game?</p>
                  <div className="space-y-3">
                      <button 
                        onClick={resumeGame}
                        className="w-full rounded-xl bg-brand py-3 font-bold text-white hover:bg-brand-dark"
                      >
                          Resume
                      </button>
                      <button 
                        onClick={resetGame}
                        className="w-full rounded-xl border border-white/10 py-3 font-semibold text-slate-300 hover:bg-white/5"
                      >
                          Quit Game
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header Stats */}
      <header className="border-b border-white/5 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-8">
                <div>
                    <p className="text-xs text-slate-400">Cash Balance</p>
                    <p className="text-xl font-mono font-bold text-white">{formatMoney(balance)}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-400">Net Worth</p>
                    <p className="text-xl font-mono font-bold text-emerald-400">{formatMoney(getTotalValue())}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <button
                    onClick={pauseGame}
                    className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                    Pause
                </button>
                <div className="rounded-lg bg-slate-800 px-4 py-2 font-mono text-xl font-bold text-white">
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
            </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <main className="flex flex-1 flex-col p-6">
            {/* Stock Tabs */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {gameData?.series.map((s) => (
                    <button
                        key={s.name}
                        onClick={() => setActiveStock(s.name)}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                            activeStock === s.name
                                ? 'border-brand bg-brand/10 text-brand'
                                : 'border-white/10 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                        {s.name}
                        {portfolio[s.name] > 0 && (
                            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">
                                {portfolio[s.name]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Graph Area */}
            <div className="flex-1 rounded-2xl border border-white/5 bg-slate-900/30 p-4">
                 <div ref={graphRef} className="h-full w-full" />
            </div>
        </main>

        {/* Sidebar Controls */}
        <aside className="relative w-80 border-l border-white/5 bg-slate-900/50 p-6 backdrop-blur-sm">
            
            {/* Transaction Animation Overlay */}
            {lastAction && (
                <div 
                    className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-opacity-20 backdrop-blur-[1px] transition-all duration-500 ${
                        lastAction.type === 'buy' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                >
                    <div className="scale-110 transform rounded-xl bg-slate-900/90 px-6 py-4 shadow-2xl transition-transform">
                        <span className={`text-2xl font-bold ${lastAction.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {lastAction.type === 'buy' ? 'BUY ORDER FILLED' : 'SELL ORDER FILLED'}
                        </span>
                    </div>
                </div>
            )}

            <div className="mb-8">
                <h3 className="mb-1 text-2xl font-bold text-white">{activeStock}</h3>
                <p className="font-mono text-3xl font-semibold text-orange-400">{formatMoney(currentPrice)}</p>
            </div>

            <div className="mb-8 space-y-4 rounded-xl border border-white/5 bg-slate-800/30 p-4">
                <div className="flex justify-between text-sm text-slate-400">
                    <span>Shares Owned</span>
                    <span className="font-bold text-white">{currentHolding}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                    <span>Value</span>
                    <span className="font-bold text-white">{formatMoney(currentHolding * currentPrice)}</span>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                        Quantity
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={tradeQty}
                        onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white focus:border-brand focus:outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleBuy}
                        disabled={balance < currentPrice * tradeQty}
                        className="rounded-xl bg-emerald-500 py-3 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Buy
                    </button>
                    <button
                        onClick={handleSell}
                        disabled={currentHolding < tradeQty}
                        className="rounded-xl bg-red-500 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Sell
                    </button>
                </div>
                <div className="text-center text-xs text-slate-500">
                    Cost: {formatMoney(currentPrice * tradeQty)}
                </div>
            </div>
        </aside>
      </div>
    </div>
  );
};

export default Game;

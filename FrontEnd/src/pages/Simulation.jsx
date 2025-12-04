import { useEffect, useState } from 'react';
import ProgressiveStockGraph from '../components/ProgressiveStockGraph';
import StartStopButtons from '../components/StartStopButtons';
import Loader from '../components/Loader';
import { useSimulation } from '../context/SimulationContext';
import { fetchSimulation } from '../services/api';

const AVAILABLE_STOCKS = ['Apple', 'Microsoft', 'Google', 'Amazon', 'Facebook', 'Tesla', 'Netflix', 'Nvidia'];

const Simulation = () => {
  const { status, simulation, setSimulation, startSimulation, setStatus, restartSimulation } = useSimulation();
  
  // Form State
  const [selectedStock, setSelectedStock] = useState('Apple');
  const [volatility, setLocalVolatility] = useState(0.2);
  const [initialPrice, setInitialPrice] = useState(150);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartNewSimulation = () => {
    setSimulation(null);
    setStatus('idle');
  };

  const handleStartSimulation = async () => {
    setIsLoading(true);
    // Prepare payload for single custom simulation
    const stockConfig = [{
        name: selectedStock,
        volatility: parseFloat(volatility),
        initial_price: parseFloat(initialPrice)
    }];

    try {
        const data = await fetchSimulation(stockConfig);
        if (data) {
            setSimulation(data);
            startSimulation();
        }
    } catch (error) {
        console.error("Simulation failed", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleRestartSimulation = () => {
     setSimulation(null);
     restartSimulation();
     // We need to re-fetch because random path generation happens on backend
     // But we want to keep parameters.
     handleStartSimulation(); 
  };
  
  // Resume from pause
  const handleStartFromStopped = () => {
    startSimulation();
  };

  // --- Configuration View ---
  if (status === 'idle') {
    return (
      <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card-surface rounded-2xl p-8 shadow-2xl shadow-black/50">
            <h2 className="mb-6 text-2xl font-bold text-white">
              Launch Simulation
            </h2>
            
            <div className="space-y-5">
                {/* Stock Selection */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Select Stock</label>
                    <select 
                        value={selectedStock}
                        onChange={(e) => setSelectedStock(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-800 p-3 text-white focus:border-brand focus:outline-none"
                    >
                        {AVAILABLE_STOCKS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Volatility */}
                <div>
                    <label className="mb-2 flex justify-between text-sm font-medium text-slate-300">
                        <span>Volatility (σ)</span>
                        <span className="text-brand">{volatility}</span>
                    </label>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="0.8" 
                        step="0.05"
                        value={volatility}
                        onChange={(e) => setLocalVolatility(e.target.value)}
                        className="h-2 w-full appearance-none rounded-lg bg-slate-700 accent-brand"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>Stable (0.1)</span>
                        <span>Volatile (0.8)</span>
                    </div>
                </div>

                {/* Initial Price */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Initial Price ($)</label>
                    <input 
                        type="number" 
                        value={initialPrice}
                        onChange={(e) => setInitialPrice(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-800 p-3 text-white focus:border-brand focus:outline-none"
                    />
                </div>

                <button
                    type="button"
                    onClick={handleStartSimulation}
                    disabled={isLoading}
                    className="mt-4 w-full rounded-xl bg-brand px-6 py-4 font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark disabled:opacity-70"
                >
                    {isLoading ? 'Generating...' : 'Start Simulation'}
                </button>
            </div>
          </div>
        </div>
      </section>
    );
  } 

  // --- Simulation View ---
  return (
    <section className="flex min-h-[calc(100vh-80px)] flex-col">
      <div className="flex-1 px-4 pb-4 lg:px-6">
        <div className="h-full">
          <ProgressiveStockGraph />
        </div>
      </div>
      <div className="w-full border-t border-white/5 bg-slate-950/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <StartStopButtons 
            onRestart={handleRestartSimulation} 
            onStart={handleStartFromStopped}
          />
        </div>
        {!simulation && status === 'running' && (
          <div className="mt-4">
            <Loader />
          </div>
        )}
        {(status === 'running' || status === 'stopped') && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleStartNewSimulation}
              className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              Configure New Simulation
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Simulation;

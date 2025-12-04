
import { useEffect, useState } from 'react';
import ProgressiveStockGraph from '../components/ProgressiveStockGraph';
import StartStopButtons from '../components/StartStopButtons';
import Loader from '../components/Loader';
import { useSimulation } from '../context/SimulationContext';
import { fetchSimulation } from '../services/api';

const AVAILABLE_STOCKS = ['Apple', 'Microsoft', 'Google', 'Amazon', 'Facebook'];

const Simulation = () => {
  const { status, simulation, setSimulation, startSimulation, setStatus, restartSimulation } = useSimulation();
  const [selectedStocks, setSelectedStocks] = useState([]);

  const handleStartNewSimulation = () => {
    setSimulation(null);
    setStatus('idle');
    setSelectedStocks([]);
  };

  const handleStockToggle = (stock) => {
    setSelectedStocks((prev) =>
      prev.includes(stock)
        ? prev.filter((s) => s !== stock)
        : [...prev, stock]
    );
  };

  const handleStartWithSelectedStocks = () => {
    if (selectedStocks.length > 0) {
      setSimulation(null);
      startSimulation();
    }
  };

  const handleRestartSimulation = () => {
    if (selectedStocks.length > 0) {
      setSimulation(null);
      restartSimulation();
    }
  };

  const handleStartFromStopped = () => {
    // Resume simulation without resetting data
    startSimulation();
  };

  useEffect(() => {
    if (status !== 'running') return;
    if (selectedStocks.length === 0) return;
    if (simulation) return; // Don't refetch if data already exists

    let cancelled = false;

    fetchSimulation(selectedStocks)
      .then((data) => {
        if (!cancelled && data) {
          setSimulation(data);
        }
      })
      .catch((error) => {
        console.error('Error fetching simulation:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [status, simulation, setSimulation, selectedStocks]);

  if (status === 'idle') {
    return (
      <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card-surface rounded-lg p-6">
            <h2 className="mb-6 text-xl font-semibold text-white">
              Select Stocks to Simulate
            </h2>
            <div className="space-y-3">
              {AVAILABLE_STOCKS.map((stock) => (
                <label
                  key={stock}
                  className="flex cursor-pointer items-center space-x-3 rounded-lg border border-white/10 bg-slate-800/50 p-3 transition hover:bg-slate-800/70"
                >
                  <input
                    type="checkbox"
                    checked={selectedStocks.includes(stock)}
                    onChange={() => handleStockToggle(stock)}
                    className="h-5 w-5 cursor-pointer rounded border-white/20 bg-slate-700 text-brand focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-slate-900"
                  />
                  <span className="text-white">{stock}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handleStartWithSelectedStocks}
              disabled={selectedStocks.length === 0}
              className="mt-6 w-full rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand"
            >
              Start Simulation
            </button>
          </div>
        </div>
      </section>
    );
  } 

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
           <button
        type="button"
        onClick={handleStartNewSimulation}
        className="w-full rounded-lg border border-amber-400/60 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
      >
        Start a new simulation
      </button>
        </div>
        {!simulation && status === 'running' && (
          <div className="mt-4">
            <Loader />
          </div>
        )}
      </div>
    </section>
  );
};

export default Simulation;

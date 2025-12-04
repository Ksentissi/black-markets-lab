import { useSimulation } from '../context/SimulationContext';

const StartStopButtons = ({ onRestart, onStart }) => {
  const { status, stopSimulation } = useSimulation();

  const handleStart = () => {
    if (onStart) {
      onStart();
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleStart}
        className="flex-1 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        disabled={status === 'running'}
      >
        Start Simulation
      </button>
      <button
        type="button"
        onClick={stopSimulation}
        className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        disabled={status === 'stopped'}
      >
        Stop Simulation
      </button>
      
    </div>
  );
};

export default StartStopButtons;


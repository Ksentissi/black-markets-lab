import { useMemo } from 'react';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import { useSimulation } from '../context/SimulationContext';

const Dashboard = () => {
  const { events, status, volatility } = useSimulation();

  const summarizedEvents = useMemo(
    () =>
      events.length
        ? events
        : [
            {
              title: 'Awaiting events',
              timestamp: new Date().toLocaleTimeString(),
              description: 'Backend did not return events yet. Keep the simulation running.',
              sentiment: 'neutral',
            },
          ],
    [events],
  );

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card-surface p-5">
          <p className="text-sm uppercase tracking-widest text-slate-400">Status</p>
          <p className="text-2xl font-semibold text-white">{status}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm uppercase tracking-widest text-slate-400">Volatility</p>
          <p className="text-2xl font-semibold text-amber-300">{volatility.toFixed(2)}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-sm uppercase tracking-widest text-slate-400">Events</p>
          <p className="text-2xl font-semibold text-emerald-300">{events.length}</p>
        </div>
      </div>

      {!events.length && status === 'running' ? (
        <Loader />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {summarizedEvents.map((event, index) => (
            <EventCard key={`${event.title}-${index}`} {...event} />
          ))}
        </div>
      )}
    </section>
  );
};

export default Dashboard;


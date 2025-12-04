import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { useSimulation } from '../context/SimulationContext';

const colors = ['#3B82F6', '#22C55E', '#F97316', '#EC4899', '#EAB308'];

const ProgressiveStockGraph = () => {
  const { simulation, status, setStatus } = useSimulation();
  const graphRef = useRef(null);
  const frameIndexRef = useRef(0);
  const intervalRef = useRef(null);

  // Initialize figure when simulation data changes
  useEffect(() => {
    if (!simulation || !graphRef.current) return;
    // We don't check status here anymore. 
    // Initialize the plot as soon as we have data.

    const container = graphRef.current;
    const { timestamps, series } = simulation;

    const maxY = Math.max(
      0,
      ...series.flatMap((s) => s.values),
    ) * 1.2;

    const data = series.map((s, idx) => ({
      x: [],
      y: [],
      mode: 'lines',
      name: `${s.name} — σ = ${Number(s.volatility ?? 0).toFixed(2)}`,
      line: {
        color: colors[idx % colors.length],
        width: 2,
      },
    }));

    const layout = {
      title: 'Stock Price Simulation (Black-Scholes Model)',
      xaxis: { title: 'Time (years)', range: [timestamps[0], timestamps[timestamps.length - 1]] },
      yaxis: { title: 'Stock Price', range: [0, maxY] },
      showlegend: true,
      plot_bgcolor: '#020617',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#e2e8f0' },
      margin: { t: 40, r: 20, b: 40, l: 50 },
    };

    // Reset and create new plot
    Plotly.newPlot(container, data, layout, {
      responsive: true,
      displayModeBar: false,
    });

    // Reset frame index only when new simulation data is loaded
    frameIndexRef.current = 0;

  }, [simulation]); // Run only when simulation data changes

  // Animate when status is running
  useEffect(() => {
    if (!simulation || !graphRef.current) return;
    
    const stopAnimation = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (status !== 'running') {
      stopAnimation();
      return;
    }

    // NOTE: We do NOT reset frameIndexRef.current = 0 here anymore.
    // This allows resuming from where we left off.

    // Stop any existing animation first
    stopAnimation();

    const { timestamps, series } = simulation;

    intervalRef.current = window.setInterval(() => {
      if (!graphRef.current) {
        stopAnimation();
        return;
      }

      const idx = frameIndexRef.current;
      if (idx >= timestamps.length) {
        stopAnimation();
        setStatus('stopped');
        return;
      }

      const update = {
        x: [],
        y: [],
      };
      const traceIndices = [];

      series.forEach((s, traceIndex) => {
        update.x.push([timestamps[idx]]);
        update.y.push([s.values[idx]]);
        traceIndices.push(traceIndex);
      });

      Plotly.extendTraces(graphRef.current, update, traceIndices);
      frameIndexRef.current += 1;
    }, 60);

    return () => {
      stopAnimation();
    };
  }, [simulation, status, setStatus]);

  return (
    <section className="card-surface h-full w-full p-4">
      <div ref={graphRef} className="h-[500px] w-full" />
    </section>
  );
};

export default ProgressiveStockGraph;

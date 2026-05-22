import { useState, useEffect, useRef, useCallback } from 'react';
import Plotly from 'plotly.js-dist-min';
import { fetchSimulation } from '../services/api';
import {
  createRoom,
  joinRoom,
  getRoom,
  updatePlayerCapital,
  startGame as startRoomGame,
  subscribeToRoom,
} from '../services/multiplayerService';

const STOCKS = ['Apple', 'Microsoft', 'Google', 'Amazon', 'Facebook', 'Tesla', 'Netflix', 'Nvidia'];

const fmt = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];
const STOCK_OPTIONS = [2, 4, 6].map((n) => ({ label: `${n} stocks`, value: n }));
const DURATION_OPTIONS = [
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
];
const CAPITAL_OPTIONS = [
  { label: '$500k', value: 500000 },
  { label: '$1M', value: 1000000 },
  { label: '$2M', value: 2000000 },
];
const REFLECTION_OPTIONS = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

function ToggleGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lab = typeof opt === 'object' ? opt.label : String(opt);
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(val)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                value === val
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {lab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DEFAULT_SETTINGS = {
  difficulty: 'Medium',
  numStocks: 4,
  duration: 180,
  startingCapital: 1000000,
  reflectionTime: 30,
};

const Multiplayer = () => {
  const [view, setView] = useState('lobby');
  const [gamePhase, setGamePhase] = useState('reflection');

  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Per-player game state
  const [balance, setBalance] = useState(1000000);
  const [portfolio, setPortfolio] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeStock, setActiveStock] = useState(null);
  const [tradeQty, setTradeQty] = useState(10);
  const [lastAction, setLastAction] = useState(null);
  const [reflectionSecondsLeft, setReflectionSecondsLeft] = useState(30);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [opponentCapital, setOpponentCapital] = useState(null);
  const [finalCapital, setFinalCapital] = useState(0);
  const [opponentFinalCapital, setOpponentFinalCapital] = useState(null);

  const graphRef = useRef(null);
  const gameLoopRef = useRef(null);
  const subscriptionRef = useRef(null);
  const gameDataRef = useRef(null);
  const gameLaunchedRef = useRef(false);
  const balanceRef = useRef(balance);
  const portfolioRef = useRef(portfolio);
  const roomCodeRef = useRef('');
  const playerIdRef = useRef(null);

  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);

  // Pre-fill join code from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setJoinCode(room.toUpperCase());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(gameLoopRef.current);
      if (subscriptionRef.current) subscriptionRef.current();
    };
  }, []);

  const calcPortfolioValue = useCallback((port, gameData, idx) =>
    Object.entries(port).reduce((sum, [sym, qty]) => {
      const s = gameData.series.find((s) => s.name === sym);
      return sum + (s ? s.values[idx] * qty : 0);
    }, 0),
  []);

  // Sync capital to localStorage whenever balance/portfolio/index changes
  useEffect(() => {
    if (view !== 'game' || gamePhase === 'finished' || !gameDataRef.current) return;
    const total = balanceRef.current + calcPortfolioValue(portfolioRef.current, gameDataRef.current, currentIndex);
    updatePlayerCapital(roomCodeRef.current, playerIdRef.current, total);
  }, [balance, portfolio, currentIndex, view, gamePhase, calcPortfolioValue]);

  // Graph update
  useEffect(() => {
    if (view !== 'game' || gamePhase !== 'playing' || !graphRef.current || !activeStock || !gameDataRef.current) return;
    const gd = gameDataRef.current;
    const series = gd.series.find((s) => s.name === activeStock);
    if (!series) return;
    Plotly.react(
      graphRef.current,
      [{
        x: gd.timestamps.slice(0, currentIndex + 1),
        y: series.values.slice(0, currentIndex + 1),
        type: 'scatter',
        mode: 'lines',
        line: { color: '#A855F7', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(168, 85, 247, 0.07)',
      }],
      {
        autosize: true,
        margin: { t: 20, r: 20, b: 40, l: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#94a3b8' },
        xaxis: { range: [0, gd.timestamps[gd.timestamps.length - 1]], showgrid: false },
        yaxis: { autorange: true, gridcolor: 'rgba(255,255,255,0.05)' },
      },
      { displayModeBar: false },
    );
  }, [currentIndex, activeStock, view, gamePhase]);

  const launchGame = useCallback((room) => {
    const { gameData, gameStartTime, settings: s } = room;
    gameDataRef.current = gameData;
    setBalance(s.startingCapital);
    setPortfolio({});
    setCurrentIndex(0);
    setActiveStock(gameData.series[0].name);
    setView('game');

    const totalSteps = gameData.timestamps.length;
    const stepMs = (s.duration * 1000) / totalSteps;
    const reflectionMs = s.reflectionTime * 1000;

    clearInterval(gameLoopRef.current);
    gameLoopRef.current = setInterval(() => {
      const elapsed = Date.now() - gameStartTime;

      if (elapsed < reflectionMs) {
        setGamePhase('reflection');
        setReflectionSecondsLeft(Math.max(1, Math.ceil((reflectionMs - elapsed) / 1000)));
        return;
      }

      setGamePhase('playing');
      const idx = Math.min(Math.floor((elapsed - reflectionMs) / stepMs), totalSteps - 1);
      setCurrentIndex(idx);

      if (idx >= totalSteps - 1) {
        clearInterval(gameLoopRef.current);
        const finalVal = balanceRef.current + calcPortfolioValue(portfolioRef.current, gameData, idx);
        updatePlayerCapital(roomCodeRef.current, playerIdRef.current, finalVal);
        setFinalCapital(finalVal);
        setGamePhase('finished');
      }
    }, 100);
  }, [calcPortfolioValue]);

  // Room subscription
  useEffect(() => {
    if (!roomCode || view === 'lobby' || view === 'joining') return;
    if (subscriptionRef.current) subscriptionRef.current();
    subscriptionRef.current = subscribeToRoom(roomCode, (room) => {
      setRoomState(room);
      const opp = room.players[playerId === 'p1' ? 'p2' : 'p1'];
      if (opp) {
        setOpponentName(opp.name);
        setOpponentCapital(opp.totalCapital);
      }
    });
    return () => {
      if (subscriptionRef.current) subscriptionRef.current();
    };
  }, [roomCode, view, playerId]);

  // React to room state changes (detect game start for P2)
  useEffect(() => {
    if (!roomState || view !== 'room' || gameLaunchedRef.current) return;
    if (roomState.status === 'playing' && roomState.gameData) {
      gameLaunchedRef.current = true;
      launchGame(roomState);
    }
  }, [roomState, view, launchGame]);

  // Track opponent final capital
  useEffect(() => {
    if (gamePhase !== 'finished' || !roomState) return;
    const opp = roomState.players[playerId === 'p1' ? 'p2' : 'p1'];
    if (opp) setOpponentFinalCapital(opp.totalCapital);
  }, [gamePhase, roomState, playerId]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    const result = createRoom(playerName.trim(), settings);
    setPlayerId(result.playerId);
    setRoomCode(result.code);
    setView('creating');
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !joinCode.trim()) return;
    setJoinError('');
    const result = joinRoom(joinCode.trim(), playerName.trim());
    if (result.error) {
      setJoinError(result.error);
      return;
    }
    setPlayerId(result.playerId);
    setRoomCode(result.code);
    gameLaunchedRef.current = false;
    setView('room');
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    const shuffled = [...STOCKS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, settings.numStocks);
    try {
      const data = await fetchSimulation(selected, 252);
      startRoomGame(roomCode, data, settings);
      gameLaunchedRef.current = true;
      launchGame(getRoom(roomCode));
    } catch (err) {
      console.error('Failed to fetch simulation data', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleBuy = () => {
    if (!gameDataRef.current) return;
    const series = gameDataRef.current.series.find((s) => s.name === activeStock);
    const price = series ? series.values[currentIndex] : 0;
    const cost = price * tradeQty;
    if (balance < cost) return;
    setBalance((b) => b - cost);
    setPortfolio((p) => ({ ...p, [activeStock]: (p[activeStock] || 0) + tradeQty }));
    setLastAction({ type: 'buy', id: Date.now() });
    setTimeout(() => setLastAction(null), 900);
  };

  const handleSell = () => {
    if (!gameDataRef.current) return;
    if ((portfolio[activeStock] || 0) < tradeQty) return;
    const series = gameDataRef.current.series.find((s) => s.name === activeStock);
    const price = series ? series.values[currentIndex] : 0;
    setBalance((b) => b + price * tradeQty);
    setPortfolio((p) => ({ ...p, [activeStock]: p[activeStock] - tradeQty }));
    setLastAction({ type: 'sell', id: Date.now() });
    setTimeout(() => setLastAction(null), 900);
  };

  const resetToLobby = () => {
    clearInterval(gameLoopRef.current);
    if (subscriptionRef.current) subscriptionRef.current();
    subscriptionRef.current = null;
    gameDataRef.current = null;
    gameLaunchedRef.current = false;
    setView('lobby');
    setGamePhase('reflection');
    setRoomCode('');
    setRoomState(null);
    setPlayerId(null);
    setBalance(1000000);
    setPortfolio({});
    setCurrentIndex(0);
    setActiveStock(null);
    setOpponentCapital(null);
    setFinalCapital(0);
    setOpponentFinalCapital(null);
    setSettings(DEFAULT_SETTINGS);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const getMyTotal = () => {
    if (!gameDataRef.current) return balance;
    return balance + calcPortfolioValue(portfolio, gameDataRef.current, currentIndex);
  };

  const getCurrentPrice = () => {
    if (!gameDataRef.current || !activeStock) return 0;
    const series = gameDataRef.current.series.find((s) => s.name === activeStock);
    return series ? series.values[currentIndex] : 0;
  };

  // ─── Views ─────────────────────────────────────────────────────────────────

  if (view === 'lobby') {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Multiplayer</h1>
            <p className="mt-2 text-slate-400">
              Challenge a friend on the same market simulation. Create a room or join an existing one.
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Room synchronization uses browser local storage. Both players must share the same browser session or device.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-5">
            <label className="mb-2 block text-sm font-medium text-slate-300">Display name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && playerName.trim() && handleCreateRoom()}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={!playerName.trim()}
              className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-6 py-5 text-left transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <p className="font-bold text-white">Create Room</p>
              <p className="mt-1 text-sm text-slate-400">Host a game and set the rules</p>
            </button>
            <button
              type="button"
              onClick={() => { if (playerName.trim()) setView('joining'); }}
              disabled={!playerName.trim()}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-5 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <p className="font-bold text-white">Join Room</p>
              <p className="mt-1 text-sm text-slate-400">Enter a room code to join a game</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'joining') {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-white">Join a Room</h2>
            <p className="mt-1 text-slate-400">Enter the room code shared by the host.</p>
          </div>
          <div>
            <input
              type="text"
              placeholder="BLK-XXXX"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 font-mono text-xl tracking-widest text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            />
            {joinError && <p className="mt-2 text-sm text-red-400">{joinError}</p>}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setView('lobby')}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-400 hover:bg-white/5"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={!joinCode.trim()}
              className="flex-1 rounded-xl bg-violet-600 py-3 font-bold text-white transition hover:bg-violet-500 disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'creating') {
    const p2 = roomState?.players?.p2;
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Room Created</h2>
          <p className="mt-1 text-slate-400">Share the code below, then configure the game settings.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Room Code</p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-4xl font-bold tracking-widest text-violet-300">{roomCode}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(roomCode)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
              >
                {linkCopied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(`${window.location.origin}/multiplayer?room=${roomCode}`)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
          <h3 className="font-semibold text-white">Game Settings</h3>
          <ToggleGroup label="Difficulty" options={DIFFICULTY_OPTIONS} value={settings.difficulty} onChange={(v) => setSettings((s) => ({ ...s, difficulty: v }))} />
          <ToggleGroup label="Number of Stocks" options={STOCK_OPTIONS} value={settings.numStocks} onChange={(v) => setSettings((s) => ({ ...s, numStocks: v }))} />
          <ToggleGroup label="Duration" options={DURATION_OPTIONS} value={settings.duration} onChange={(v) => setSettings((s) => ({ ...s, duration: v }))} />
          <ToggleGroup label="Starting Capital" options={CAPITAL_OPTIONS} value={settings.startingCapital} onChange={(v) => setSettings((s) => ({ ...s, startingCapital: v }))} />
          <ToggleGroup label="Reflection Time" options={REFLECTION_OPTIONS} value={settings.reflectionTime} onChange={(v) => setSettings((s) => ({ ...s, reflectionTime: v }))} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Players</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-white">{playerName}</span>
              <span className="ml-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">Host</span>
            </div>
            <div className="flex items-center gap-3">
              {p2 ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-white">{p2.name}</span>
                  <span className="ml-1 text-xs text-emerald-400">Joined</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-slate-600" />
                  <span className="text-slate-500">Waiting for opponent...</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={resetToLobby} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-400 transition hover:bg-white/5">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartGame}
            disabled={!p2 || isStarting}
            className="flex-1 rounded-xl bg-violet-600 py-3 font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isStarting ? 'Starting...' : p2 ? 'Start Game' : 'Waiting for Opponent'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'room') {
    const room = roomState;
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-white">Room Joined</h2>
            <p className="mt-1 text-slate-400">Waiting for the host to start the game.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Room Code</p>
            <p className="mt-1 font-mono text-3xl font-bold text-violet-300">{roomCode}</p>
          </div>
          {room && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-2.5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Settings</h3>
              {[
                ['Difficulty', room.settings.difficulty],
                ['Stocks', `${room.settings.numStocks} assets`],
                ['Duration', `${room.settings.duration / 60} min`],
                ['Starting Capital', fmt(room.settings.startingCapital)],
                ['Reflection', `${room.settings.reflectionTime}s`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-medium text-white">{val}</span>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Players</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-white">{room?.players?.p1?.name ?? 'Host'}</span>
                <span className="ml-auto rounded-full bg-violet-500/20 px-2 text-xs text-violet-300">Host</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-white">{playerName}</span>
                <span className="ml-auto text-xs text-emerald-400">Ready</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-2 w-2 animate-pulse rounded-full bg-slate-600" />
            Waiting for host to start...
          </div>
        </div>
      </div>
    );
  }

  // ─── Game Views ─────────────────────────────────────────────────────────────

  if (view === 'game' && gamePhase === 'reflection') {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900/50 p-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white">Market Preview</h2>
            <p className="mt-2 text-slate-400">Study the initial conditions before trading begins.</p>
            <div className="mt-4 font-mono text-5xl font-bold text-violet-400">{reflectionSecondsLeft}s</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gameDataRef.current?.series.map((stock) => (
              <div key={stock.name} className="rounded-xl border border-white/5 bg-slate-800/50 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-white">{stock.name}</span>
                  <span className="text-xs text-slate-500">σ {stock.volatility.toFixed(2)}</span>
                </div>
                <div className="font-mono text-xl font-bold text-white">{fmt(stock.values[0])}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 animate-pulse text-center text-xs text-slate-600">
            vs {opponentName} — trading opens shortly
          </p>
        </div>
      </div>
    );
  }

  if (view === 'game' && gamePhase === 'finished') {
    const myCapital = finalCapital;
    const oppCapital = opponentFinalCapital ?? opponentCapital ?? 0;
    const iWon = myCapital >= oppCapital;
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-center">
          <h2 className="text-3xl font-bold text-white">{iWon ? 'Victory' : 'Defeat'}</h2>
          <p className="mt-2 text-slate-400">
            {iWon ? 'You achieved the highest final capital.' : `${opponentName} outperformed you this session.`}
          </p>
          <div className="my-8 space-y-4">
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <p className="text-xs text-slate-400">Your Final Capital</p>
              <p className="font-mono text-3xl font-bold text-white">{fmt(myCapital)}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-800/40 p-4">
              <p className="text-xs text-slate-400">{opponentName}</p>
              <p className="font-mono text-2xl font-bold text-slate-300">
                {oppCapital > 0 ? fmt(oppCapital) : '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetToLobby}
            className="w-full rounded-xl bg-violet-600 py-3 font-bold text-white transition hover:bg-violet-500"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Playing
  const currentPrice = getCurrentPrice();
  const currentHolding = portfolio[activeStock] || 0;
  const myTotal = getMyTotal();

  return (
    <div className="relative flex h-[calc(100vh-80px)] flex-col overflow-hidden">
      <header className="border-b border-white/5 bg-slate-900/80 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-slate-500">Cash</p>
              <p className="font-mono text-lg font-bold text-white">{fmt(balance)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Your Capital</p>
              <p className="font-mono text-lg font-bold text-emerald-400">{fmt(myTotal)}</p>
            </div>
            {opponentCapital !== null && (
              <div>
                <p className="text-xs text-slate-500">{opponentName}</p>
                <p className="font-mono text-lg font-bold text-slate-300">{fmt(opponentCapital)}</p>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm font-bold text-violet-300">
            VS {opponentName}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col p-6">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {gameDataRef.current?.series.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setActiveStock(s.name)}
                className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  activeStock === s.name
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
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
          <div className="flex-1 rounded-2xl border border-white/5 bg-slate-900/30 p-4">
            <div ref={graphRef} className="h-full w-full" />
          </div>
        </main>

        <aside className="relative w-72 border-l border-white/5 bg-slate-900/50 p-6">
          {lastAction && (
            <div className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${lastAction.type === 'buy' ? 'bg-emerald-500/8' : 'bg-red-500/8'}`}>
              <span className={`rounded-xl bg-slate-900/90 px-5 py-3 text-xl font-bold shadow-xl ${lastAction.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                {lastAction.type === 'buy' ? 'BUY FILLED' : 'SELL FILLED'}
              </span>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-xl font-bold text-white">{activeStock}</h3>
            <p className="font-mono text-3xl font-semibold text-violet-400">{fmt(currentPrice)}</p>
          </div>

          <div className="mb-6 space-y-3 rounded-xl border border-white/5 bg-slate-800/30 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Shares Owned</span>
              <span className="font-bold text-white">{currentHolding}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Position Value</span>
              <span className="font-bold text-white">{fmt(currentHolding * currentPrice)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={tradeQty}
                onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleBuy}
                disabled={balance < currentPrice * tradeQty}
                className="rounded-xl bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Buy
              </button>
              <button
                type="button"
                onClick={handleSell}
                disabled={currentHolding < tradeQty}
                className="rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sell
              </button>
            </div>
            <p className="text-center text-xs text-slate-500">Cost: {fmt(currentPrice * tradeQty)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Multiplayer;

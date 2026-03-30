import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import {
  BACKEND_URL,
  INITIAL_CAPITAL,
  INSIGHT_COST,
  NET_WORTH_SAMPLE_EVERY,
} from '../constants/game';
import { fetchSimulation } from '../services/api';

const GameContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const GameProvider = ({ children }) => {
  // ── Mode & phase ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState(null);           // 'solo' | 'multiplayer' | null
  const [gameStatus, setGameStatus] = useState('setup');
  // setup | reflection | playing | insight_popup | paused | finished

  // ── Personal player state ────────────────────────────────────────────────────
  const [balance, setBalance] = useState(INITIAL_CAPITAL);
  const [portfolio, setPortfolio] = useState({});         // { stock: qty }
  const [costBasis, setCostBasis] = useState({});         // { stock: avgCost }
  const [transactions, setTransactions] = useState([]);
  const [purchasedInsights, setPurchasedInsights] = useState([]);
  const [realizedPnl, setRealizedPnl] = useState(0);
  const [netWorthHistory, setNetWorthHistory] = useState([]);

  // ── Shared game data ─────────────────────────────────────────────────────────
  const [gameData, setGameData] = useState(null);
  const [insightSchedule, setInsightSchedule] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [activeStock, setActiveStock] = useState(null);
  const [gameDifficulty, setGameDifficulty] = useState('Medium');

  // ── Insight UI state ─────────────────────────────────────────────────────────
  const [pendingInsight, setPendingInsight] = useState(null);
  const triggeredStepsRef = useRef(new Set());

  // ── Multiplayer ──────────────────────────────────────────────────────────────
  const [roomId, setRoomId] = useState(null);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isHost, setIsHost] = useState(false);

  const socketRef = useRef(null);

  // ─── Insight trigger (watches currentIndex in solo & multi) ─────────────────
  // This effect checks whether the current playhead has reached an insight step.
  // It NEVER modifies gameData — insight purchase is purely informational.
  useEffect(() => {
    if (!insightSchedule.length) return;
    if (gameStatus !== 'playing' && gameStatus !== 'insight_popup') return;

    const due = insightSchedule.find(
      (i) => i.step <= currentIndex && !triggeredStepsRef.current.has(i.step),
    );

    if (due && !pendingInsight) {
      triggeredStepsRef.current.add(due.step);
      setPendingInsight(due);
      // In solo mode we pause so the player can decide comfortably
      if (mode === 'solo') {
        setGameStatus('insight_popup');
      }
      // In multiplayer the game continues — modal is non-blocking
    }
  }, [currentIndex, insightSchedule, gameStatus, mode, pendingInsight]);

  // ─── Net-worth sampling (solo only — multi comes from server) ────────────────
  useEffect(() => {
    if (mode !== 'solo' || gameStatus !== 'playing' || !gameData) return;
    if (currentIndex % NET_WORTH_SAMPLE_EVERY !== 0) return;

    const nw = _computeNetWorth(balance, portfolio, gameData, currentIndex);
    setNetWorthHistory((prev) => [
      ...prev,
      { index: currentIndex, value: Math.round(nw) },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, gameStatus, mode]);

  // ─── Multiplayer socket setup ────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('room:created', ({ roomId: id, players, isHost: host, config }) => {
      setRoomId(id);
      setRoomPlayers(players);
      setIsHost(host);
      setGameDifficulty(config.difficulty);
      setGameStatus('lobby');
    });

    socket.on('room:joined', ({ roomId: id, players, config }) => {
      setRoomId(id);
      setRoomPlayers(players);
      setIsHost(false);
      setGameDifficulty(config.difficulty);
      setGameStatus('lobby');
    });

    socket.on('room:player_joined', ({ players }) => setRoomPlayers(players));
    socket.on('room:player_left', ({ players }) => setRoomPlayers(players));

    socket.on('game:reflection', ({ gameData: gd, insightSchedule: is_ }) => {
      setGameData(gd);
      setInsightSchedule(is_ || []);
      setActiveStock(gd.series[0]?.name ?? null);
      triggeredStepsRef.current = new Set();
      setCurrentIndex(0);
      setTimeLeft(180);
      setGameStatus('reflection');
    });

    socket.on('game:start', () => setGameStatus('playing'));

    socket.on('game:tick', ({ currentIndex: idx, timeLeft: tl, leaderboard: lb }) => {
      setCurrentIndex(idx);
      setTimeLeft(tl);
      setLeaderboard(lb);
    });

    socket.on('game:over', ({ leaderboard: lb }) => {
      setLeaderboard(lb);
      setGameStatus('finished');
    });

    socket.on('trade:confirmed', (state) => _applyServerState(state));

    socket.on('leaderboard:update', ({ leaderboard: lb }) => setLeaderboard(lb));

    socket.on('insight:purchased', ({ insight, balance: newBal }) => {
      setBalance(newBal);
      setPurchasedInsights((prev) => [...prev, insight]);
      setPendingInsight(null);
    });

    socket.on('error', ({ message }) => console.warn('[socket error]', message));

    return socket;
  }, []);

  const disconnectSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  function _applyServerState(state) {
    setBalance(state.balance);
    setPortfolio(state.portfolio);
    setCostBasis(state.costBasis);
    setTransactions(state.transactions);
    setRealizedPnl(state.realizedPnl);
    setNetWorthHistory(state.netWorthHistory ?? []);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const selectMode = useCallback((m) => {
    setMode(m);
    if (m === 'multiplayer') {
      connectSocket();
    }
  }, [connectSocket]);

  const startSoloGame = useCallback(async (difficulty, selectedStocks) => {
    const data = await fetchSimulation(selectedStocks, 2000);
    _resetPlayerState();
    triggeredStepsRef.current = new Set();
    setGameDifficulty(difficulty);
    setGameData(data);
    setInsightSchedule(data.insightSchedule || []);
    setActiveStock(data.series[0]?.name ?? null);
    setCurrentIndex(0);
    setTimeLeft(180);
    setLeaderboard([]);
    setGameStatus('reflection');
  }, []);

  const createRoom = useCallback((playerName, difficulty, numStocks) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('room:create', { playerName, difficulty, numStocks });
  }, []);

  const joinRoom = useCallback((rid, playerName) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('room:join', { roomId: rid, playerName });
  }, []);

  const startMultiplayerGame = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !isHost) return;
    socket.emit('game:start_session', { roomId });
  }, [isHost, roomId]);

  const pauseGame = useCallback(() => {
    if (gameStatus === 'playing') setGameStatus('paused');
  }, [gameStatus]);

  const resumeGame = useCallback(() => {
    if (gameStatus === 'paused') setGameStatus('playing');
    if (gameStatus === 'insight_popup') setGameStatus('playing');
  }, [gameStatus]);

  const dismissInsight = useCallback(() => {
    setPendingInsight(null);
    if (gameStatus === 'insight_popup') setGameStatus('playing');
  }, [gameStatus]);

  const resetGame = useCallback(() => {
    setMode(null);
    setGameStatus('setup');
    _resetPlayerState();
    setGameData(null);
    setInsightSchedule([]);
    setCurrentIndex(0);
    setTimeLeft(180);
    setActiveStock(null);
    setPendingInsight(null);
    triggeredStepsRef.current = new Set();
    setRoomId(null);
    setRoomPlayers([]);
    setLeaderboard([]);
    setIsHost(false);
    disconnectSocket();
  }, [disconnectSocket]);

  // ─── Solo trade actions ──────────────────────────────────────────────────────

  const buyStock = useCallback(
    (symbol, quantity, price) => {
      if (mode === 'multiplayer') {
        socketRef.current?.emit('trade:buy', { roomId, stock: symbol, quantity });
        return true;
      }
      // Solo: update state locally
      const cost = quantity * price;
      if (balance < cost) return false;

      setBalance((b) => b - cost);
      setPortfolio((p) => ({ ...p, [symbol]: (p[symbol] || 0) + quantity }));
      setCostBasis((cb) => {
        const prev = cb[symbol] || 0;
        const prevQty = portfolio[symbol] || 0;
        const newQty = prevQty + quantity;
        return { ...cb, [symbol]: (prevQty * prev + quantity * price) / newQty };
      });
      setTransactions((t) => [
        ...t,
        { type: 'buy', stock: symbol, qty: quantity, price, timestamp: Date.now() },
      ]);
      return true;
    },
    [mode, balance, portfolio, roomId],
  );

  const sellStock = useCallback(
    (symbol, quantity, price) => {
      if (mode === 'multiplayer') {
        socketRef.current?.emit('trade:sell', { roomId, stock: symbol, quantity });
        return true;
      }
      const owned = portfolio[symbol] || 0;
      if (owned < quantity) return false;

      const basis = costBasis[symbol] || 0;
      setRealizedPnl((p) => p + quantity * (price - basis));
      setBalance((b) => b + quantity * price);
      setPortfolio((p) => {
        const next = { ...p, [symbol]: p[symbol] - quantity };
        if (next[symbol] === 0) delete next[symbol];
        return next;
      });
      setTransactions((t) => [
        ...t,
        { type: 'sell', stock: symbol, qty: quantity, price, timestamp: Date.now() },
      ]);
      return true;
    },
    [mode, portfolio, costBasis, roomId],
  );

  const buyInsight = useCallback(
    (insight) => {
      if (mode === 'multiplayer') {
        socketRef.current?.emit('insight:buy', { roomId, step: insight.step });
        return;
      }
      // Solo: deduct locally and reveal
      if (balance < INSIGHT_COST) return;
      setBalance((b) => b - INSIGHT_COST);
      setPurchasedInsights((prev) => [...prev, insight]);
      setPendingInsight(null);
      setGameStatus('playing');
    },
    [mode, balance, roomId],
  );

  // ─── Internal helpers ────────────────────────────────────────────────────────

  function _resetPlayerState() {
    setBalance(INITIAL_CAPITAL);
    setPortfolio({});
    setCostBasis({});
    setTransactions([]);
    setPurchasedInsights([]);
    setRealizedPnl(0);
    setNetWorthHistory([]);
  }

  // ─── Derived values (memoised for performance) ───────────────────────────────

  const portfolioValue = useMemo(() => {
    if (!gameData) return 0;
    return Object.entries(portfolio).reduce((sum, [symbol, qty]) => {
      const s = gameData.series.find((x) => x.name === symbol);
      const price = s ? s.values[Math.min(currentIndex, s.values.length - 1)] : 0;
      return sum + qty * price;
    }, 0);
  }, [portfolio, gameData, currentIndex]);

  const netWorth = useMemo(() => balance + portfolioValue, [balance, portfolioValue]);

  const unrealizedPnl = useMemo(() => {
    if (!gameData) return 0;
    return Object.entries(portfolio).reduce((sum, [symbol, qty]) => {
      const s = gameData.series.find((x) => x.name === symbol);
      const price = s ? s.values[Math.min(currentIndex, s.values.length - 1)] : 0;
      const basis = costBasis[symbol] || 0;
      return sum + qty * (price - basis);
    }, 0);
  }, [portfolio, costBasis, gameData, currentIndex]);

  // ─── Context value ────────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      // Mode & phase
      mode,
      gameStatus,
      setGameStatus,

      // Personal state
      balance,
      portfolio,
      costBasis,
      transactions,
      purchasedInsights,
      realizedPnl,
      netWorthHistory,

      // Derived
      portfolioValue,
      netWorth,
      unrealizedPnl,

      // Game data
      gameData,
      insightSchedule,
      currentIndex,
      setCurrentIndex,
      timeLeft,
      setTimeLeft,
      activeStock,
      setActiveStock,
      gameDifficulty,

      // Insight UI
      pendingInsight,
      setPendingInsight,
      dismissInsight,

      // Multiplayer
      roomId,
      roomPlayers,
      leaderboard,
      isHost,
      socketRef,

      // Actions
      selectMode,
      startSoloGame,
      createRoom,
      joinRoom,
      startMultiplayerGame,
      pauseGame,
      resumeGame,
      resetGame,
      buyStock,
      sellStock,
      buyInsight,
    }),
    [
      mode, gameStatus, balance, portfolio, costBasis, transactions,
      purchasedInsights, realizedPnl, netWorthHistory,
      portfolioValue, netWorth, unrealizedPnl,
      gameData, insightSchedule, currentIndex, timeLeft, activeStock, gameDifficulty,
      pendingInsight, roomId, roomPlayers, leaderboard, isHost,
      selectMode, startSoloGame, createRoom, joinRoom, startMultiplayerGame,
      pauseGame, resumeGame, resetGame, buyStock, sellStock, buyInsight, dismissInsight,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
};

// ─── Internal utility (not exported) ─────────────────────────────────────────

function _computeNetWorth(balance, portfolio, gameData, currentIndex) {
  let total = balance;
  for (const [symbol, qty] of Object.entries(portfolio)) {
    const s = gameData.series.find((x) => x.name === symbol);
    if (s) total += qty * s.values[Math.min(currentIndex, s.values.length - 1)];
  }
  return total;
}

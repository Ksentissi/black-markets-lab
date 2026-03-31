/**
 * useMultiplayerGame — bridges Socket.IO events to the GameContext in Multiplayer mode.
 *
 * The server drives the tick (currentIndex / timeLeft) and all state changes
 * (trade confirmations, insight reveals, leaderboard updates) arrive via
 * socket events that are already wired up in GameContext.  This hook's only
 * job is the reflection-period countdown, which is purely cosmetic / local.
 *
 * Is a no-op when mode !== 'multiplayer'.
 */

import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

export const useMultiplayerGame = () => {
  const { mode, gameStatus, setGameStatus } = useGame();

  const reflectionTimerRef = useRef(null);

  // Reflection countdown (client-side cosmetic timer matching server's delay)
  useEffect(() => {
    if (mode !== 'multiplayer' || gameStatus !== 'reflection') return;

    // The server will emit 'game:start' after REFLECTION_PERIOD_SECONDS seconds.
    // We don't override the transition here — the server event handles it.
    // This hook is intentionally minimal for multiplayer.

    return () => clearInterval(reflectionTimerRef.current);
  }, [mode, gameStatus, setGameStatus]);
};

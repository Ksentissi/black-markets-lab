/**
 * useSoloGame — manages the client-side game loop for Solo mode.
 *
 * Responsibilities:
 *  - Advance currentIndex on a fixed interval (2 000 steps / 180 s)
 *  - Count down timeLeft every second
 *  - Transition to 'finished' when time or steps run out
 *  - Is a no-op when mode !== 'solo'
 */

import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_DURATION_SECONDS, GAME_SIMULATION_STEPS } from '../constants/game';

export const useSoloGame = () => {
  const {
    mode,
    gameStatus,
    gameData,
    setGameStatus,
    setCurrentIndex,
    setTimeLeft,
  } = useGame();

  const timerRef = useRef(null);
  const loopRef  = useRef(null);

  useEffect(() => {
    // Only run in solo mode while the game is actively playing
    if (mode !== 'solo' || gameStatus !== 'playing' || !gameData) return;

    const totalSteps   = gameData.timestamps.length;
    const tickInterval = (GAME_DURATION_SECONDS * 1000) / totalSteps;

    // 1-second countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameStatus('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Price animation loop
    loopRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= totalSteps - 1) {
          setGameStatus('finished');
          return prev;
        }
        return prev + 1;
      });
    }, tickInterval);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(loopRef.current);
    };
  }, [mode, gameStatus, gameData, setGameStatus, setCurrentIndex, setTimeLeft]);
};

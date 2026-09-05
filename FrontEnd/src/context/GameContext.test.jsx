import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';
import { INITIAL_CAPITAL } from '../constants/game';

vi.mock('../services/api', () => ({
  fetchSimulation: vi.fn(),
}));

import { fetchSimulation } from '../services/api';

const SYNTHETIC_DATA = {
  timestamps: [0, 1, 2],
  series: [
    { name: 'Apple', volatility: 0.3, values: [100, 110, 120], metadata: {} },
    { name: 'Tesla', volatility: 0.5, values: [200, 190, 210], metadata: {} },
  ],
};

describe('GameContext', () => {
  beforeEach(() => {
    fetchSimulation.mockReset();
    fetchSimulation.mockResolvedValue(SYNTHETIC_DATA);
  });

  it('starts with the setup phase and no chosen mode', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });
    expect(result.current.gameStatus).toBe('setup');
    expect(result.current.mode).toBe(null);
    expect(result.current.balance).toBe(INITIAL_CAPITAL);
  });

  it('loads simulation data and moves to reflection on startSoloGame', async () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    await act(async () => {
      result.current.selectMode('solo');
      await result.current.startSoloGame('Medium', ['Apple', 'Tesla']);
    });

    expect(fetchSimulation).toHaveBeenCalledWith(['Apple', 'Tesla'], 2000);
    expect(result.current.gameStatus).toBe('reflection');
    expect(result.current.gameData).toEqual(SYNTHETIC_DATA);
    expect(result.current.activeStock).toBe('Apple');
  });

  it('buyStock deducts balance and records the position', async () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });
    await act(async () => {
      result.current.selectMode('solo');
      await result.current.startSoloGame('Medium', ['Apple', 'Tesla']);
    });

    act(() => {
      const ok = result.current.buyStock('Apple', 10, 100);
      expect(ok).toBe(true);
    });

    expect(result.current.balance).toBe(INITIAL_CAPITAL - 1000);
    expect(result.current.portfolio.Apple).toBe(10);
  });

  it('buyStock refuses a purchase that exceeds the available balance', async () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });
    await act(async () => {
      result.current.selectMode('solo');
      await result.current.startSoloGame('Medium', ['Apple', 'Tesla']);
    });

    act(() => {
      const ok = result.current.buyStock('Apple', 1, INITIAL_CAPITAL + 1);
      expect(ok).toBe(false);
    });

    expect(result.current.balance).toBe(INITIAL_CAPITAL);
    expect(result.current.portfolio.Apple).toBeUndefined();
  });

  it('sellStock returns cash and reduces the held quantity', async () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });
    await act(async () => {
      result.current.selectMode('solo');
      await result.current.startSoloGame('Medium', ['Apple', 'Tesla']);
    });
    act(() => { result.current.buyStock('Apple', 10, 100); });

    act(() => {
      const ok = result.current.sellStock('Apple', 4, 110);
      expect(ok).toBe(true);
    });

    expect(result.current.portfolio.Apple).toBe(6);
    expect(result.current.balance).toBe(INITIAL_CAPITAL - 1000 + 440);
  });

  it('sellStock refuses to sell more than is owned', async () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });
    await act(async () => {
      result.current.selectMode('solo');
      await result.current.startSoloGame('Medium', ['Apple', 'Tesla']);
    });

    act(() => {
      const ok = result.current.sellStock('Apple', 1, 100);
      expect(ok).toBe(false);
    });
  });

  it('resetGame restores the initial setup state', async () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });
    await act(async () => {
      result.current.selectMode('solo');
      await result.current.startSoloGame('Medium', ['Apple', 'Tesla']);
    });
    act(() => { result.current.buyStock('Apple', 10, 100); });

    act(() => { result.current.resetGame(); });

    expect(result.current.gameStatus).toBe('setup');
    expect(result.current.mode).toBe(null);
    expect(result.current.balance).toBe(INITIAL_CAPITAL);
    expect(result.current.portfolio).toEqual({});
    expect(result.current.gameData).toBe(null);
  });
});

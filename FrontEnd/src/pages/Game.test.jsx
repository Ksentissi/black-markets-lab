/**
 * Regression test for the "Play" page.
 *
 * A previous version of this file read state from the wrong context
 * (SimulationContext instead of GameContext), so `startGame`, `balance`
 * and `portfolio` were all undefined and clicking "Start Game" crashed
 * the page. This test exercises the full setup -> reflection -> trading
 * flow through the real GameProvider to catch that class of bug.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GameProvider } from '../context/GameContext';
import Game from './Game';

vi.mock('plotly.js-dist-min', () => ({
  default: { react: vi.fn(), purge: vi.fn() },
}));

vi.mock('../services/api', () => ({
  fetchSimulation: vi.fn(),
}));

import { fetchSimulation } from '../services/api';

const SYNTHETIC_DATA = {
  timestamps: [0, 0.5, 1, 1.5, 2],
  series: [
    { name: 'Apple', volatility: 0.3, values: [100, 102, 104, 103, 105], metadata: { risk: 'Low', industry: 'Tech' } },
    { name: 'Tesla', volatility: 0.5, values: [200, 195, 190, 205, 210], metadata: { risk: 'High', industry: 'Auto' } },
  ],
};

function renderGame() {
  return render(
    <MemoryRouter>
      <GameProvider>
        <Game />
      </GameProvider>
    </MemoryRouter>,
  );
}

describe('Game page (Play)', () => {
  beforeEach(() => {
    fetchSimulation.mockReset();
    fetchSimulation.mockResolvedValue(SYNTHETIC_DATA);
  });

  it('renders the setup screen first', () => {
    renderGame();
    expect(screen.getByText('Trading Game')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
  });

  it('clicking Start Game loads the simulation and reaches the reflection screen', async () => {
    renderGame();

    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    await waitFor(() => expect(fetchSimulation).toHaveBeenCalled());
    expect(await screen.findByText('Market Analysis')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Tesla')).toBeInTheDocument();
  });

  it('skipping reflection reaches the trading UI with working buy/sell controls', async () => {
    renderGame();

    fireEvent.click(screen.getByRole('button', { name: /start game/i }));
    await screen.findByText('Market Analysis');

    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    expect(await screen.findByRole('button', { name: /^buy$/i })).toBeInTheDocument();
    expect(screen.getAllByText('$1,000,000').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^buy$/i }));

    // Cash decreases once the trade is filled — cash and net worth are no
    // longer both exactly $1,000,000 (10 shares bought below cost basis of net worth).
    await waitFor(() => {
      expect(screen.getAllByText('$1,000,000').length).toBeLessThan(2);
    });
    expect(screen.getByText('Shares owned')).toBeInTheDocument();
  });
});

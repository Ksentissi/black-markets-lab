/**
 * MultiplayerLobby — handles Create Room / Join Room and the waiting room.
 *
 * Flow:
 *   [tab: Create] enter name + settings → createRoom()
 *   [tab: Join]   enter code + name      → joinRoom()
 *   Both land in waiting room where host sees "Start Game" button.
 */

import { useState } from 'react';
import { useGame } from '../context/GameContext';

const MultiplayerLobby = () => {
  const { gameStatus, roomId, roomPlayers, isHost, createRoom, joinRoom, startMultiplayerGame } = useGame();

  const [tab, setTab] = useState('create');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numStocks, setNumStocks] = useState(4);
  const [error, setError] = useState('');

  // ── Waiting room ────────────────────────────────────────────────────────────
  if (gameStatus === 'lobby') {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-500">Multiplayer Room</p>
            <h2 className="mt-1 text-3xl font-bold text-white">
              Room{' '}
              <span className="font-mono text-brand">{roomId}</span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Share this code with friends to invite them.
            </p>
          </div>

          {/* Players list */}
          <div className="mb-8 space-y-2">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Players ({roomPlayers.length})
            </p>
            {roomPlayers.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-800/50 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-medium text-white">{p.name}</span>
                </div>
                {p.isHost && (
                  <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-semibold text-brand">
                    Host
                  </span>
                )}
              </div>
            ))}
            {roomPlayers.length < 2 && (
              <p className="pt-2 text-center text-sm text-slate-500 animate-pulse">
                Waiting for more players to join…
              </p>
            )}
          </div>

          {isHost ? (
            <button
              onClick={startMultiplayerGame}
              disabled={roomPlayers.length < 1}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] disabled:opacity-50"
            >
              Start Game
            </button>
          ) : (
            <p className="text-center text-sm text-slate-400 animate-pulse">
              Waiting for host to start the game…
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Create / Join tabs ───────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!playerName.trim()) { setError('Please enter your name.'); return; }
    setError('');
    createRoom(playerName.trim(), difficulty, numStocks);
  };

  const handleJoin = () => {
    if (!playerName.trim()) { setError('Please enter your name.'); return; }
    if (!roomCode.trim())   { setError('Please enter a room code.'); return; }
    setError('');
    joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
        <h2 className="mb-6 text-2xl font-bold text-white">Multiplayer</h2>

        {/* Tabs */}
        <div className="mb-8 flex rounded-xl bg-slate-800/50 p-1">
          {['create', 'join'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                tab === t ? 'bg-brand text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Your Name</label>
            <input
              type="text"
              maxLength={30}
              placeholder="e.g. Warren"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-brand focus:outline-none"
            />
          </div>

          {tab === 'join' ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Room Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. A3F9C1"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 font-mono text-white placeholder-slate-500 focus:border-brand focus:outline-none"
              />
            </div>
          ) : (
            <>
              {/* Difficulty */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Easy', 'Medium', 'Hard'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`rounded-lg border py-2 text-sm font-semibold transition ${
                        difficulty === d
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stocks */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Number of Stocks</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 4, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumStocks(n)}
                      className={`rounded-lg border py-2 text-sm font-semibold transition ${
                        numStocks === n
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {n} Stocks
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02]"
          >
            {tab === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;

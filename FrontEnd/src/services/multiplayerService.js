const ROOM_PREFIX = 'bml_room_';
const POLL_MS = 600;

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'BLK-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function roomKey(code) {
  return ROOM_PREFIX + code;
}

function saveRoom(room) {
  localStorage.setItem(roomKey(room.code), JSON.stringify(room));
}

export function getRoom(code) {
  const raw = localStorage.getItem(roomKey(code));
  return raw ? JSON.parse(raw) : null;
}

export function createRoom(hostName, settings) {
  const code = generateCode();
  const room = {
    code,
    host: 'p1',
    status: 'waiting',
    settings,
    players: {
      p1: { id: 'p1', name: hostName, totalCapital: settings.startingCapital, ready: true },
      p2: null,
    },
    gameData: null,
    gameStartTime: null,
    createdAt: Date.now(),
  };
  saveRoom(room);
  return { code, playerId: 'p1' };
}

export function joinRoom(code, playerName) {
  const normalised = code.trim().toUpperCase();
  const room = getRoom(normalised);
  if (!room) return { error: 'Room not found. Check the code and try again.' };
  if (room.players.p2) return { error: 'Room is already full.' };
  if (room.status !== 'waiting') return { error: 'This game session has already started.' };
  room.players.p2 = {
    id: 'p2',
    name: playerName,
    totalCapital: room.settings.startingCapital,
    ready: true,
  };
  saveRoom(room);
  return { code: room.code, playerId: 'p2' };
}

export function updatePlayerCapital(code, playerId, totalCapital) {
  const room = getRoom(code);
  if (!room || !room.players[playerId]) return;
  room.players[playerId].totalCapital = totalCapital;
  saveRoom(room);
}

export function startGame(code, gameData, finalSettings) {
  const room = getRoom(code);
  if (!room) return;
  room.status = 'playing';
  room.gameData = gameData;
  room.gameStartTime = Date.now();
  if (finalSettings) room.settings = finalSettings;
  saveRoom(room);
}

export function subscribeToRoom(code, callback) {
  const id = setInterval(() => {
    const room = getRoom(code);
    if (room) callback(room);
  }, POLL_MS);
  return () => clearInterval(id);
}

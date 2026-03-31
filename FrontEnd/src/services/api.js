import axios from 'axios';
import { BACKEND_URL } from '../constants/game';

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Fetch a complete pre-computed simulation from the server.
 *
 * @param {string[]|object[]} selectedStocks  Stock names or config objects
 * @param {number}            numSteps        Number of price steps (default 252)
 */
export const fetchSimulation = async (selectedStocks = [], numSteps = 252) => {
  const response = await api.post('/api/simulate', {
    stocks: selectedStocks,
    num_steps: numSteps,
  });
  return response.data;
};

export default api;

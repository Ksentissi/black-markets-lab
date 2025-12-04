import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8050',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchSimulation = async (selectedStocks = [], numSteps = 252) => {
  const response = await api.post('/api/simulate', {
    stocks: selectedStocks,
    num_steps: numSteps
  });
  return response.data;
};

export default api;

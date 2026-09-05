import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Simulation from './pages/Simulation';
import Game from './pages/Game';
import Multiplayer from './pages/Multiplayer';
import { SimulationProvider } from './context/SimulationContext';
import { GameProvider } from './context/GameContext';

const App = () => (
  <SimulationProvider>
    <GameProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">
            <Navbar />
            <div className="page-container">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/game" element={<Game />} />
                <Route path="/simulation" element={<Simulation />} />
                <Route path="/multiplayer" element={<Multiplayer />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </GameProvider>
  </SimulationProvider>
);

export default App;

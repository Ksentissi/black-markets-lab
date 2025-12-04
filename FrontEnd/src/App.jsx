import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Simulation from './pages/Simulation';
import Game from './pages/Game';
import Dashboard from './pages/Dashboard';
import { SimulationProvider } from './context/SimulationContext';

const App = () => (
  <SimulationProvider>
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <div className="page-container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/game" element={<Game />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  </SimulationProvider>
);

export default App;

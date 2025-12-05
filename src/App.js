import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AudioProvider } from './context/AudioContext';
import StartPage from './packages/StartPage';
import MainMenu from './packages/MainMenu';
import GodotGame from './packages/GameInit/GameCanvas/GodotGame';

function App() {
  return (
    <AudioProvider>
      <Router>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/main" element={<MainMenu />} />
          <Route path="/game" element={<GodotGame />} />
        </Routes>
      </Router>
    </AudioProvider>
  );
}

export default App;

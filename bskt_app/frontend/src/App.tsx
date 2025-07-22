import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UserDash from './pages/UserDash';
import TradingChart from './pages/TradingChart';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard/:userId" element={<UserDash />} />
        <Route path="/trading/:sessionId" element={<TradingChart />} />
      </Routes>
    </Router>
  );
}

export default App;

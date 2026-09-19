import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fields from './pages/Fields';
import Detect from './pages/Detect';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soil-50">
        <p className="text-soil-400 text-sm">Loading KrishiVed…</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/fields" element={<Fields />} />
        <Route path="/detect" element={<Detect />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </AppShell>
  );
}

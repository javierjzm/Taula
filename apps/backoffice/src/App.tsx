import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Login from '@/pages/Login';
import Agenda from '@/pages/Agenda';
import Availability from '@/pages/Availability';
import Profile from '@/pages/Profile';
import Stats from '@/pages/Stats';
import Layout from '@/components/Layout';

function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/agenda" />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="*" element={<Navigate to="/agenda" />} />
      </Routes>
    </Layout>
  );
}

export default App;

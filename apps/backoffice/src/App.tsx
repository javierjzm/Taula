import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Login from '@/pages/Login';
import Agenda from '@/pages/Agenda';
import Calendar from '@/pages/Calendar';
import Setup from '@/pages/Setup';
import BlockedDates from '@/pages/BlockedDates';
import Profile from '@/pages/Profile';
import Stats from '@/pages/Stats';
import Reviews from '@/pages/Reviews';
import MenuManager from '@/pages/MenuManager';
import Offers from '@/pages/Offers';
import Layout from '@/components/Layout';

function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/agenda" />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/menu" element={<MenuManager />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/blocked-dates" element={<BlockedDates />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="*" element={<Navigate to="/agenda" />} />
      </Routes>
    </Layout>
  );
}

export default App;

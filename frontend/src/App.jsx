import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import Login from './pages/Login';
import RegisterOrganization from './pages/RegisterOrganization';
import AcceptInvitation from './pages/AcceptInvitation';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Meetings from './pages/Meetings';
import Topics from './pages/Topics';
import Funds from './pages/Funds';
import Members from './pages/Members';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro-organizacion" element={<RegisterOrganization />} />
      <Route path="/invitar/:token" element={<AcceptInvitation />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="juntas" element={<Meetings />} />
        <Route path="temas" element={<Topics />} />
        <Route path="arcas" element={<Funds />} />
        <Route path="vecinos" element={<Members />} />
        <Route path="ajustes" element={<Settings />} />
      </Route>
    </Routes>
  );
}

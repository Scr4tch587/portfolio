import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import RequireAuth from './components/admin/RequireAuth';
import { AdminProvider } from './context/AdminContext';
import './index.css';
import AdminPanel from './pages/AdminPanel';
import DevLogin from './pages/DevLogin';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AdminProvider>
        <Routes>
          <Route path="/dev" element={<DevLogin />} />
          <Route
            path="/dev/admin"
            element={(
              <RequireAuth>
                <AdminPanel />
              </RequireAuth>
            )}
          />
          <Route path="/*" element={<App />} />
        </Routes>
      </AdminProvider>
    </BrowserRouter>
  </StrictMode>,
);

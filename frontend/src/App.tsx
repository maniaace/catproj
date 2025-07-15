import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Assets from './components/Assets';
import Teams from './components/Teams';
import Vulnerabilities from './components/Vulnerabilities';
import Scanning from './components/Scanning';
import InsightVM from './components/InsightVM';
import Reports from './components/Reports';
import Users from './components/Users';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00A651', // Safaricom Green
      dark: '#008A44',
      light: '#33B96C',
    },
    secondary: {
      main: '#E60000', // Safaricom Red
      dark: '#CC0000',
      light: '#FF3333',
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      color: '#000000',
    },
    h2: {
      fontWeight: 500,
      color: '#000000',
    },
    h3: {
      fontWeight: 500,
      color: '#000000',
    },
    h4: {
      fontWeight: 500,
      color: '#000000',
    },
    h5: {
      fontWeight: 500,
      color: '#000000',
    },
    h6: {
      fontWeight: 500,
      color: '#000000',
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" /> : <Login />} 
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <Assets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <Teams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vulnerabilities"
        element={
          <ProtectedRoute>
            <Vulnerabilities />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scanning"
        element={
          <ProtectedRoute>
            <Scanning />
          </ProtectedRoute>
        }
      />
      <Route
        path="/insightvm"
        element={
          <ProtectedRoute>
            <InsightVM />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

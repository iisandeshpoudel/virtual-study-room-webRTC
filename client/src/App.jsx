import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Room from './components/Room';
import RoomList from './components/RoomList';
import { Toaster } from './components/ui/toaster';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  useEffect(() => {
    // Add dark mode class to html element
    document.documentElement.classList.add('dark');
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-background text-foreground">
          <Routes>
            <Route
              path="/"
              element={
                user ? (
                  <Navigate to="/rooms" />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              }
            />
            <Route
              path="/register"
              element={
                user ? (
                  <Navigate to="/rooms" />
                ) : (
                  <Register onRegister={handleLogin} />
                )
              }
            />
            <Route
              path="/rooms"
              element={
                user ? (
                  <RoomList user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/room/:roomId"
              element={
                user ? (
                  <Room user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
          </Routes>
        </div>
      </Router>
      <Toaster />
    </>
  );
}

export default App;

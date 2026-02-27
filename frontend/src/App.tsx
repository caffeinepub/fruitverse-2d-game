import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LoginPage from '@/pages/LoginPage';
import GamePage from '@/pages/GamePage';
import AdminPanel from '@/pages/AdminPanel';

const queryClient = new QueryClient();

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('fruitverse-user');
  });

  const [currentRoute, setCurrentRoute] = useState<'login' | 'game' | 'admin'>(() => {
    const path = window.location.pathname;
    if (path === '/admin') return 'admin';
    return currentUser ? 'game' : 'login';
  });

  useEffect(() => {
    // Handle browser navigation
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setCurrentRoute('admin');
      } else if (currentUser) {
        setCurrentRoute('game');
      } else {
        setCurrentRoute('login');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('fruitverse-user', currentUser);
    } else {
      localStorage.removeItem('fruitverse-user');
    }
  }, [currentUser]);

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    setCurrentRoute('game');
    window.history.pushState({}, '', '/');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRoute('login');
    window.history.pushState({}, '', '/');
  };

  const handleExitAdmin = () => {
    setCurrentRoute(currentUser ? 'game' : 'login');
    window.history.pushState({}, '', '/');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          {currentRoute === 'admin' && <AdminPanel onExit={handleExitAdmin} />}
          {currentRoute === 'game' && currentUser && (
            <GamePage username={currentUser} onLogout={handleLogout} />
          )}
          {currentRoute === 'login' && <LoginPage onLoginSuccess={handleLoginSuccess} />}
          <Toaster />
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;

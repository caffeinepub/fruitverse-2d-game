import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useSubmitScore } from "@/hooks/useQueries";
import AdminPanel from "@/pages/AdminPanel";
import GamePage from "@/pages/GamePage";
import LoginPage from "@/pages/LoginPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const queryClient = new QueryClient();

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem("fruitverse-user");
  });

  const [currentRoute, setCurrentRoute] = useState<"login" | "game" | "admin">(
    () => {
      const path = window.location.pathname;
      if (path === "/admin") return "admin";
      return localStorage.getItem("fruitverse-user") ? "game" : "login";
    },
  );

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitScoreMutation = useSubmitScore();

  // Retry pending (offline-queued) scores on app load
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - run once on mount only
  useEffect(() => {
    const pending: Array<{
      username: string;
      score: number;
      timestamp: number;
    }> = JSON.parse(localStorage.getItem("pendingScores") || "[]");
    if (pending.length === 0) return;
    const retryAll = async () => {
      const remaining: typeof pending = [];
      for (const item of pending) {
        try {
          await submitScoreMutation.mutateAsync({
            username: item.username,
            score: item.score,
          });
        } catch {
          remaining.push(item);
        }
      }
      if (remaining.length < pending.length) {
        localStorage.setItem("pendingScores", JSON.stringify(remaining));
      }
    };
    retryAll();
  }, []);

  // Idle session timeout (30 min)
  useEffect(() => {
    if (!currentUser) return;

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        localStorage.removeItem("fruitverse-user");
        setCurrentUser(null);
        setCurrentRoute("login");
        window.history.pushState({}, "", "/");
        toast("Oturum süreniz doldu. Lütfen tekrar giriş yapın.");
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "touchstart", "click"] as const;
    for (const ev of events) window.addEventListener(ev, resetTimer);
    resetTimer();

    return () => {
      for (const ev of events) window.removeEventListener(ev, resetTimer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [currentUser]);

  useEffect(() => {
    // Handle browser navigation
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/admin") {
        setCurrentRoute("admin");
      } else if (currentUser) {
        setCurrentRoute("game");
      } else {
        setCurrentRoute("login");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("fruitverse-user", currentUser);
    } else {
      localStorage.removeItem("fruitverse-user");
    }
  }, [currentUser]);

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    setCurrentRoute("game");
    window.history.pushState({}, "", "/");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRoute("login");
    window.history.pushState({}, "", "/");
  };

  const handleExitAdmin = () => {
    setCurrentRoute(currentUser ? "game" : "login");
    window.history.pushState({}, "", "/");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          {currentRoute === "admin" && <AdminPanel onExit={handleExitAdmin} />}
          {currentRoute === "game" && currentUser && (
            <GamePage username={currentUser} onLogout={handleLogout} />
          )}
          {currentRoute === "login" && (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )}
          <Toaster />
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;

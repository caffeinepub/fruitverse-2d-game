import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type VisualTheme = 'tropical' | 'berry' | 'citrus';

interface ThemeContextType {
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>(() => {
    const stored = localStorage.getItem('fruitverse-visual-theme');
    if (stored && ['tropical', 'berry', 'citrus'].includes(stored)) {
      return stored as VisualTheme;
    }
    return 'tropical';
  });

  useEffect(() => {
    localStorage.setItem('fruitverse-visual-theme', visualTheme);
  }, [visualTheme]);

  const setVisualTheme = (theme: VisualTheme) => {
    setVisualThemeState(theme);
  };

  return (
    <ThemeContext.Provider value={{ visualTheme, setVisualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useVisualTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useVisualTheme must be used within a ThemeProvider');
  }
  return context;
}

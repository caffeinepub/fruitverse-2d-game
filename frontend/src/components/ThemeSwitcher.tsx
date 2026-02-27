import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useVisualTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Palette } from 'lucide-react';

export default function ThemeSwitcher() {
  const { visualTheme, setVisualTheme } = useVisualTheme();
  const { t } = useLanguage();

  const themes = [
    { value: 'tropical' as const, label: t('theme.tropical'), emoji: '🍍' },
    { value: 'berry' as const, label: t('theme.berry'), emoji: '🫐' },
    { value: 'citrus' as const, label: t('theme.citrus'), emoji: '🍋' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Switch theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 !bg-white dark:!bg-gray-800 !opacity-100 border border-gray-200 dark:border-gray-700 shadow-lg"
        style={{ backgroundColor: 'var(--background)', opacity: 1 }}
      >
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => setVisualTheme(theme.value)}
            className={visualTheme === theme.value ? 'bg-accent' : ''}
          >
            <span className="mr-2 text-xl">{theme.emoji}</span>
            <span className="font-medium">{theme.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

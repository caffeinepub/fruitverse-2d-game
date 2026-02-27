import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVisualTheme } from '@/contexts/ThemeContext';
import FruitAnimation from '@/components/FruitAnimation';
import { Zap, Puzzle, Infinity, Apple } from 'lucide-react';

export type GameMode = 'normal' | 'speed' | 'puzzle' | 'endless';

interface ModeSelectionPageProps {
  onModeSelect: (mode: GameMode) => void;
}

export default function ModeSelectionPage({ onModeSelect }: ModeSelectionPageProps) {
  const { t } = useLanguage();
  const { visualTheme } = useVisualTheme();

  const themeBackgrounds = {
    tropical: '/assets/generated/tropical-fruits-bg.dim_800x600.png',
    berry: '/assets/generated/berry-forest-bg.dim_800x600.png',
    citrus: '/assets/generated/citrus-blast-bg.dim_800x600.png',
  };

  const modes = [
    {
      id: 'normal' as GameMode,
      icon: Apple,
      iconSrc: '/assets/generated/normal-mode-icon-transparent.dim_64x64.png',
      title: t('mode.normal.title'),
      description: t('mode.normal.description'),
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'speed' as GameMode,
      icon: Zap,
      iconSrc: '/assets/generated/speed-mode-icon-transparent.dim_64x64.png',
      title: t('mode.speed.title'),
      description: t('mode.speed.description'),
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'puzzle' as GameMode,
      icon: Puzzle,
      iconSrc: '/assets/generated/puzzle-mode-icon-transparent.dim_64x64.png',
      title: t('mode.puzzle.title'),
      description: t('mode.puzzle.description'),
      color: 'from-blue-500 to-purple-500',
    },
    {
      id: 'endless' as GameMode,
      icon: Infinity,
      iconSrc: '/assets/generated/endless-mode-icon-transparent.dim_64x64.png',
      title: t('mode.endless.title'),
      description: t('mode.endless.description'),
      color: 'from-green-500 to-teal-500',
    },
  ];

  return (
    <div className="mode-selection-container">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: `url(${themeBackgrounds[visualTheme]})`,
          filter: 'brightness(0.6)',
        }}
      />

      {/* Animated Fruits */}
      <FruitAnimation theme={visualTheme} />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              {t('mode.selectMode')}
            </h1>
            <p className="text-lg sm:text-xl text-white/90">
              {t('mode.selectModeDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {modes.map((mode) => {
              const Icon = mode.icon;
              return (
                <Card
                  key={mode.id}
                  className="mode-card hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/95 backdrop-blur-sm"
                  onClick={() => onModeSelect(mode.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg`}>
                        <img 
                          src={mode.iconSrc} 
                          alt={mode.title}
                          className="w-12 h-12"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            const iconElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (iconElement) iconElement.style.display = 'block';
                          }}
                        />
                        <Icon className="w-12 h-12 text-white hidden" />
                      </div>
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">{mode.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <CardDescription className="text-base mb-6 min-h-[60px]">
                      {mode.description}
                    </CardDescription>
                    <Button 
                      className={`w-full bg-gradient-to-r ${mode.color} hover:opacity-90 text-white font-semibold`}
                      size="lg"
                    >
                      {t('mode.play')}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

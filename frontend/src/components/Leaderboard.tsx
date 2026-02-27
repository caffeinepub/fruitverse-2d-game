import { useGetTopPlayers, useGetUserRank, useGetUserProfile } from '@/hooks/useQueries';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trophy, Gift } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import BadgeDisplay from '@/components/BadgeDisplay';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LeaderboardProps {
  currentUsername: string;
}

export default function Leaderboard({ currentUsername }: LeaderboardProps) {
  const { t } = useLanguage();
  const { data: topPlayers, isLoading: loadingPlayers } = useGetTopPlayers(10);
  const { data: currentRank, isLoading: loadingRank } = useGetUserRank(currentUsername);

  const getTrophyColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-500';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-orange-600';
      default:
        return 'text-gray-300';
    }
  };

  const getRewardText = (rank: number) => {
    switch (rank) {
      case 1:
        return t('leaderboard.firstPlaceReward');
      case 2:
        return t('leaderboard.secondPlaceReward');
      case 3:
        return t('leaderboard.thirdPlaceReward');
      default:
        return '';
    }
  };

  return (
    <Card className="border-2 shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-orange-50 via-yellow-50 to-green-50 dark:from-orange-950 dark:via-yellow-950 dark:to-green-950">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <CardTitle className="text-3xl">{t('leaderboard.title')}</CardTitle>
        </div>
        <CardDescription className="text-center text-base">
          {t('leaderboard.monthlyRankings')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {/* Current User Rank */}
        {!loadingRank && currentRank !== undefined && (
          <div className="mb-6 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="text-lg px-3 py-1">
                  #{currentRank === 0 ? '-' : currentRank}
                </Badge>
                <div>
                  <p className="font-semibold text-lg">{t('leaderboard.yourRank')}</p>
                  <p className="text-sm text-muted-foreground">{currentUsername}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Players List */}
        <ScrollArea className="h-[400px] pr-4">
          {loadingPlayers ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {topPlayers?.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser = player.username.toLowerCase() === currentUsername.toLowerCase();

                return (
                  <PlayerRow
                    key={player.username}
                    username={player.username}
                    score={player.score}
                    rank={rank}
                    isCurrentUser={isCurrentUser}
                    trophyColor={getTrophyColor(rank)}
                    rewardText={getRewardText(rank)}
                    t={t}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface PlayerRowProps {
  username: string;
  score: number;
  rank: number;
  isCurrentUser: boolean;
  trophyColor: string;
  rewardText: string;
  t: (key: string, params?: any) => string;
}

function PlayerRow({
  username,
  score,
  rank,
  isCurrentUser,
  trophyColor,
  rewardText,
  t,
}: PlayerRowProps) {
  const { data: userProfile } = useGetUserProfile(username);

  return (
    <div
      className={`flex items-center justify-between rounded-lg border-2 p-4 transition-all ${
        isCurrentUser
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-gray-200 bg-white hover:border-primary/50 dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Rank */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant={rank <= 3 ? 'default' : 'secondary'}
            className="text-lg font-bold px-3 py-1"
          >
            #{rank}
          </Badge>
          {rank <= 3 && <Trophy className={`h-6 w-6 ${trophyColor}`} />}
          {rank <= 3 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Gift className="h-5 w-5 text-primary" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{rewardText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {userProfile && <BadgeDisplay badges={userProfile.badges} size="sm" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base truncate">{username}</p>
            {isCurrentUser && (
              <p className="text-xs text-primary font-medium">{t('leaderboard.you')}</p>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-primary">{score.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{t('leaderboard.points')}</p>
        </div>
      </div>
    </div>
  );
}

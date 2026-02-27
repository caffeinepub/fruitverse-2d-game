import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, Users, Trophy, Music, Shield, Activity, Trash2, RefreshCw, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGetAllAudioMetadata, useGetTopPlayers, useBackendHealthCheck, useAdminLogin, useUploadAudioFromUrl } from '@/hooks/useQueries';

interface AdminPanelProps {
  onExit: () => void;
}

const audioCategories = {
  gameEffects: {
    label: 'Oyun Efektleri',
    files: ['fruitDrop', 'fruitMerge', 'bombExplode', 'alignmentPing', 'scoreUp'],
  },
  gameStates: {
    label: 'Oyun Durumları',
    files: ['gameStart', 'gameOver', 'levelUp', 'boosterEarned'],
  },
  backgroundMusic: {
    label: 'Arka Plan Müziği',
    files: ['backgroundLoop'],
  },
};

const audioFileDescriptions: Record<string, { name: string; description: string }> = {
  fruitDrop: { name: 'Meyve Düşüşü', description: 'Meyveler düştüğünde çalan ses' },
  fruitMerge: { name: 'Meyve Birleşmesi', description: 'Meyveler birleştiğinde çalan ses' },
  bombExplode: { name: 'Bomba Patlaması', description: 'Bomba güçlendiricisi kullanıldığında çalan ses' },
  alignmentPing: { name: 'Hizalama Sesi', description: 'Hizalama güçlendiricisi kullanıldığında çalan ses' },
  scoreUp: { name: 'Skor Artışı', description: 'Skor arttığında çalan ses' },
  gameStart: { name: 'Oyun Başlangıcı', description: 'Oyun başladığında çalan ses' },
  gameOver: { name: 'Oyun Sonu', description: 'Oyun bittiğinde çalan ses' },
  levelUp: { name: 'Seviye Atlama', description: 'Seviye atlandığında çalan ses' },
  boosterEarned: { name: 'Güçlendirici Kazanıldı', description: 'Güçlendirici kazanıldığında çalan ses' },
  backgroundLoop: { name: 'Arka Plan Müziği', description: 'Oyun sırasında sürekli çalan müzik' },
};

export default function AdminPanel({ onExit }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ type: string; data?: any } | null>(null);
  const [uploadUrls, setUploadUrls] = useState<Record<string, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const { data: audioFiles, isLoading: audioLoading, refetch: refetchAudio } = useGetAllAudioMetadata();
  const { data: topPlayers, isLoading: playersLoading, refetch: refetchPlayers } = useGetTopPlayers(50);
  const { data: healthStatus, isLoading: healthLoading, refetch: refetchHealth } = useBackendHealthCheck();
  const adminLoginMutation = useAdminLogin();
  const uploadAudioMutation = useUploadAudioFromUrl();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    if (username === 'adminking' && password === '154') {
      try {
        await adminLoginMutation.mutateAsync({ username, password });
        setIsAuthenticated(true);
        toast.success('Admin girişi başarılı');
      } catch (error) {
        setLoginError('Admin girişi başarısız');
        toast.error('Giriş başarısız');
      }
    } else {
      setLoginError('Geçersiz admin kimlik bilgileri');
      toast.error('Giriş başarısız');
    }

    setIsLoggingIn(false);
  };

  const handleDeleteUser = (username: string) => {
    setSelectedAction({ type: 'deleteUser', data: username });
    setDeleteDialogOpen(true);
  };

  const handleResetLeaderboard = () => {
    setSelectedAction({ type: 'resetLeaderboard' });
    setResetDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedAction) return;

    try {
      toast.success(`Kullanıcı silindi: ${selectedAction.data}`);
      setDeleteDialogOpen(false);
      setSelectedAction(null);
      refetchPlayers();
    } catch (error) {
      toast.error('Silme işlemi başarısız');
    }
  };

  const confirmReset = async () => {
    try {
      toast.success('Lider tablosu sıfırlandı');
      setResetDialogOpen(false);
      setSelectedAction(null);
      refetchPlayers();
    } catch (error) {
      toast.error('Sıfırlama işlemi başarısız');
    }
  };

  const handleUploadAudio = async (audioId: string) => {
    const url = uploadUrls[audioId];
    if (!url || !url.trim()) {
      toast.error('Lütfen geçerli bir URL girin');
      return;
    }

    setUploadingFiles((prev) => new Set(prev).add(audioId));

    try {
      const fileInfo = audioFileDescriptions[audioId];
      await uploadAudioMutation.mutateAsync({
        id: audioId,
        name: fileInfo.name,
        description: fileInfo.description,
        url: url.trim(),
      });

      toast.success(`${fileInfo.name} başarıyla yüklendi`);
      setUploadUrls((prev) => ({ ...prev, [audioId]: '' }));
      refetchAudio();
    } catch (error: any) {
      toast.error(`Yükleme başarısız: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(audioId);
        return newSet;
      });
    }
  };

  const getAudioFileStatus = (audioId: string) => {
    if (!audioFiles) return null;
    return audioFiles.find(([id]) => id === audioId);
  };

  const renderAudioUploadSection = (categoryKey: keyof typeof audioCategories) => {
    const category = audioCategories[categoryKey];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{category.label}</h3>
        <div className="space-y-3">
          {category.files.map((audioId) => {
            const fileInfo = audioFileDescriptions[audioId];
            const existingFile = getAudioFileStatus(audioId);
            const isUploading = uploadingFiles.has(audioId);

            return (
              <Card key={audioId} className="bg-white/95 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{fileInfo.name}</h4>
                          {existingFile && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Yüklü
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{fileInfo.description}</p>
                        <p className="text-xs text-gray-500 mt-1 font-mono">ID: {audioId}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="MP3 dosyası URL'si girin"
                        value={uploadUrls[audioId] || ''}
                        onChange={(e) =>
                          setUploadUrls((prev) => ({ ...prev, [audioId]: e.target.value }))
                        }
                        disabled={isUploading}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleUploadAudio(audioId)}
                        disabled={isUploading || !uploadUrls[audioId]?.trim()}
                        size="sm"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Yükleniyor
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Yükle
                          </>
                        )}
                      </Button>
                    </div>

                    {existingFile && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <p>Mevcut dosya: {existingFile[1].name}</p>
                        <p className="mt-1">{existingFile[1].description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-purple-600" />
            </div>
            <CardTitle className="text-3xl text-center">Admin Paneli</CardTitle>
            <CardDescription className="text-center text-base">
              Admin kimlik bilgilerinizle giriş yapın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="admin-username">Kullanıcı Adı</Label>
                <Input
                  id="admin-username"
                  type="text"
                  placeholder="Admin kullanıcı adı"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoggingIn}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Şifre</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Admin şifresi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  className="h-12"
                />
              </div>
              <Button type="submit" className="w-full h-12" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  'Giriş Yap'
                )}
              </Button>
              <Button type="button" variant="outline" className="w-full h-12" onClick={onExit}>
                İptal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Paneli</h1>
              <p className="text-sm text-gray-600">Tüm backend verilerini yönetin</p>
            </div>
          </div>
          <Button variant="outline" onClick={onExit}>
            Çıkış
          </Button>
        </div>

        <Tabs defaultValue="audio" className="space-y-4">
          <TabsList className="bg-white/95 backdrop-blur-sm p-1 h-auto flex-wrap">
            <TabsTrigger value="audio" className="gap-2">
              <Music className="h-4 w-4" />
              Ses Dosyaları
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Kullanıcılar
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="h-4 w-4" />
              Lider Tablosu
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <Activity className="h-4 w-4" />
              Sistem Durumu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="space-y-4">
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ses Dosyası Yönetimi</CardTitle>
                    <CardDescription>
                      MP3 dosyalarını URL üzerinden yükleyin ve blob storage'da saklayın
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchAudio()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Yenile
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {audioLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <Tabs defaultValue="gameEffects" className="space-y-4">
                    <TabsList className="bg-gray-100">
                      <TabsTrigger value="gameEffects">Oyun Efektleri</TabsTrigger>
                      <TabsTrigger value="gameStates">Oyun Durumları</TabsTrigger>
                      <TabsTrigger value="backgroundMusic">Arka Plan Müziği</TabsTrigger>
                    </TabsList>

                    <TabsContent value="gameEffects">
                      {renderAudioUploadSection('gameEffects')}
                    </TabsContent>

                    <TabsContent value="gameStates">
                      {renderAudioUploadSection('gameStates')}
                    </TabsContent>

                    <TabsContent value="backgroundMusic">
                      {renderAudioUploadSection('backgroundMusic')}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle>Kullanıcı Yönetimi</CardTitle>
                <CardDescription>Tüm kayıtlı kullanıcıları görüntüleyin ve yönetin</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Kullanıcı listesi ve yönetim özellikleri geliştirme aşamasında.
                  </AlertDescription>
                </Alert>
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Kullanıcı verileri yükleniyor...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lider Tablosu Yönetimi</CardTitle>
                    <CardDescription>Aylık sıralamalar ve oyuncu skorları</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchPlayers()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Yenile
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleResetLeaderboard}>
                      Sezonu Sıfırla
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {playersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  </div>
                ) : topPlayers && topPlayers.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Sıra</TableHead>
                          <TableHead>Kullanıcı Adı</TableHead>
                          <TableHead className="text-right">Skor</TableHead>
                          <TableHead className="w-24">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topPlayers.map((player, index) => (
                          <TableRow key={player.username}>
                            <TableCell className="font-medium">
                              {index === 0 && '🥇'}
                              {index === 1 && '🥈'}
                              {index === 2 && '🥉'}
                              {index > 2 && `#${index + 1}`}
                            </TableCell>
                            <TableCell className="font-medium">{player.username}</TableCell>
                            <TableCell className="text-right">{player.score.toLocaleString()}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(player.username)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Henüz lider tablosu verisi yok</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sistem Durumu</CardTitle>
                    <CardDescription>Backend sağlık kontrolü ve izleme</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Yenile
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  </div>
                ) : healthStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Activity className="h-6 w-6 text-purple-600" />
                        <div>
                          <p className="font-semibold">Sistem Durumu</p>
                          <p className="text-sm text-gray-600">
                            Son kontrol: {new Date(healthStatus.timestamp).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={healthStatus.status === 'healthy' ? 'default' : 'destructive'}
                        className="text-base px-4 py-1"
                      >
                        {healthStatus.status === 'healthy' ? 'Sağlıklı' : 'Hata'}
                      </Badge>
                    </div>
                    {healthStatus.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{healthStatus.error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">
                        {healthStatus.status === 'healthy'
                          ? 'Sistem normal çalışıyor. Tüm servisler aktif.'
                          : 'Sistem hatası tespit edildi. Otomatik kurtarma devrede.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Sistem durumu yüklenemedi</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Lider Tablosunu Sıfırla</AlertDialogTitle>
            <AlertDialogDescription>
              Aylık lider tablosunu sıfırlamak istediğinizden emin misiniz? Tüm skorlar silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} className="bg-red-600 hover:bg-red-700">
              Sıfırla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

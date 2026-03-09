import FruitAnimation from "@/components/FruitAnimation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVisualTheme } from "@/contexts/ThemeContext";
import {
  useCheckDailyLogin,
  useLoginUser,
  useRegisterUser,
} from "@/hooks/useQueries";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { t } = useLanguage();
  const { visualTheme } = useVisualTheme();
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [loginError, setLoginError] = useState("");

  const registerMutation = useRegisterUser();
  const loginMutation = useLoginUser();
  const checkDailyLoginMutation = useCheckDailyLogin();

  const themeBackgrounds = {
    tropical: "/assets/generated/tropical-fruits-bg.dim_800x600.png",
    berry: "/assets/generated/berry-forest-bg.dim_800x600.png",
    citrus: "/assets/generated/citrus-blast-bg.dim_800x600.png",
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");

    if (!registerUsername.trim()) {
      setRegisterError(t("validation.usernameRequired"));
      return;
    }

    if (registerUsername.length < 5) {
      setRegisterError(t("validation.usernameMinLength"));
      return;
    }

    if (registerPassword.length !== 6) {
      setRegisterError(t("validation.passwordLength"));
      return;
    }

    const passwordRegex = /^[a-zA-Z0-9]+$/;
    if (!passwordRegex.test(registerPassword)) {
      setRegisterError(t("validation.passwordFormat"));
      return;
    }

    try {
      await registerMutation.mutateAsync({
        username: registerUsername,
        password: registerPassword,
      });
      toast.success(t("success.registerSuccess"));
      setRegisterUsername("");
      setRegisterPassword("");
      setLoginUsername(registerUsername);
    } catch (error: any) {
      const errorMessage = error?.message || t("error.registerFailed");
      setRegisterError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError(t("validation.credentialsRequired"));
      return;
    }

    try {
      await loginMutation.mutateAsync({
        username: loginUsername,
        password: loginPassword,
      });
      toast.success(t("success.loginSuccess"));

      // Check daily login streak in background
      try {
        const streakBigInt = await checkDailyLoginMutation.mutateAsync({
          username: loginUsername,
        });
        const streak = Number(streakBigInt);
        localStorage.setItem("fruitverse_daily_streak", String(streak));
        if (streak >= 2) {
          setTimeout(() => {
            toast(`🔥 ${streak} günlük seri!`, { duration: 3000 });
          }, 800);
        }
      } catch {
        // Streak check failure should not block login
      }

      onLoginSuccess(loginUsername);
    } catch (error: any) {
      const errorMessage = error?.message || t("error.loginFailed");
      setLoginError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: `url(${themeBackgrounds[visualTheme]})`,
          filter: "brightness(0.7)",
        }}
      />

      {/* Animated Fruits */}
      <FruitAnimation theme={visualTheme} />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {/* Header Controls */}
          <div className="mb-4 flex justify-end gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>

          {/* Logo and Title */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="animate-bounce">
                <img
                  src="/assets/generated/fruitverse-logo-transparent.dim_200x200.png"
                  alt="FruitVerse Logo"
                  className="h-40 w-40 drop-shadow-2xl"
                />
              </div>
            </div>
            <h1 className="mb-2 bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 bg-clip-text text-6xl font-bold text-transparent drop-shadow-lg">
              {t("app.title")}
            </h1>
            <p className="text-xl font-semibold text-white drop-shadow-md">
              {t("app.welcome")}
            </p>
          </div>

          {/* Login/Register Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2 bg-white/90 backdrop-blur-sm">
              <TabsTrigger value="login" className="text-base font-semibold">
                {t("auth.login")}
              </TabsTrigger>
              <TabsTrigger value="register" className="text-base font-semibold">
                {t("auth.register")}
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <Card className="border-4 border-primary/30 bg-white/95 shadow-2xl backdrop-blur-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-3xl">
                    {t("auth.loginTitle")}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {t("auth.loginDescription")}
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
                      <Label htmlFor="login-username" className="text-base">
                        {t("auth.username")}
                      </Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder={t("auth.usernamePlaceholder")}
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        disabled={loginMutation.isPending}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-base">
                        {t("auth.password")}
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder={t("auth.passwordPlaceholder")}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={loginMutation.isPending}
                        maxLength={6}
                        className="h-12 text-base"
                      />
                      <p className="text-sm text-muted-foreground">
                        {t("auth.passwordHint")}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="h-12 w-full text-lg font-semibold"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {t("auth.loggingIn")}
                        </>
                      ) : (
                        t("auth.login")
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <Card className="border-4 border-primary/30 bg-white/95 shadow-2xl backdrop-blur-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-3xl">
                    {t("auth.registerTitle")}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {t("auth.registerDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    {registerError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{registerError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="register-username" className="text-base">
                        {t("auth.username")}
                      </Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder={t("auth.registerUsernamePlaceholder")}
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        disabled={registerMutation.isPending}
                        className="h-12 text-base"
                      />
                      <p className="text-sm text-muted-foreground">
                        {t("auth.usernameHint")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-base">
                        {t("auth.password")}
                      </Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder={t("auth.registerPasswordPlaceholder")}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        disabled={registerMutation.isPending}
                        maxLength={6}
                        className="h-12 text-base"
                      />
                      <p className="text-sm text-muted-foreground">
                        {t("auth.registerPasswordHint")}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="h-12 w-full text-lg font-semibold"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {t("auth.registering")}
                        </>
                      ) : (
                        t("auth.register")
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Privacy Policy Footer */}
          <footer className="mt-6 text-center">
            <a
              href="https://sites.google.com/view/fruitverseapp/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-white/90 underline decoration-white/50 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
            >
              {t("footer.privacyPolicy")}
            </a>
          </footer>
        </div>
      </div>
    </div>
  );
}

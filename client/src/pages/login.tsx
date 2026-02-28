import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_SUBMIT_INTERVAL_MS = 2000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 3 * 60 * 1000;

function formatLockoutRemaining(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const lastSubmitTimeRef = useRef(0);

  useEffect(() => {
    if (lockoutUntil <= 0) return;
    const tick = () => {
      const remaining = lockoutUntil - Date.now();
      if (remaining <= 0) {
        setLockoutUntil(0);
        setLockoutRemaining(0);
        setFailedAttempts(0);
        setError("");
        return;
      }
      setLockoutRemaining(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const isLockedOut = lockoutUntil > Date.now();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      setError(t("auth.too_many_attempts"));
      return;
    }
    const now = Date.now();
    if (now - lastSubmitTimeRef.current < MIN_SUBMIT_INTERVAL_MS && failedAttempts > 0) {
      setError(t("auth.please_wait"));
      return;
    }
    lastSubmitTimeRef.current = now;
    setError("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("auth.email_required"));
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError(t("auth.email_invalid"));
      return;
    }
    if (!password) {
      setError(t("auth.password_required"));
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await login(trimmedEmail, password);
      if (result.success) {
        setFailedAttempts(0);
        setLocation("/dashboard");
      } else {
        setError(result.message || t("auth.invalid_credentials"));
        setFailedAttempts((n) => {
          const next = n + 1;
          if (next >= MAX_FAILED_ATTEMPTS) {
            setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
            setLockoutRemaining(LOCKOUT_DURATION_MS);
          }
          return next;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network or server error. Please try again.";
      setError(message);
      setFailedAttempts((n) => {
        const next = n + 1;
        if (next >= MAX_FAILED_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
          setLockoutRemaining(LOCKOUT_DURATION_MS);
        }
        return next;
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#f8fafc] p-3 sm:p-4 md:p-6 animate-page-fade safe-area-padding">
      <div className="w-full max-w-[100%] sm:max-w-md">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <Logo size="xl" className="mb-3 sm:mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e293b] text-center px-1" data-testid="text-app-title">{t("app.name")}</h1>
          <p className="text-xs sm:text-sm text-[#64748b] mt-1 text-center px-2">{t("app.tagline")}</p>
        </div>

        <Card className="border border-[#e2e8f0] bg-white shadow-sm">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-base sm:text-lg text-[#1e293b]">{t("auth.signin")}</CardTitle>
            <CardDescription className="text-[#64748b] text-sm">{t("auth.enter_credentials")}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1e293b] text-sm font-medium">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn("h-11 sm:h-12 border-[#e2e8f0] text-base touch-manipulation")}
                  data-testid="input-email"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#1e293b] text-sm font-medium">{t("auth.password")}</Label>
                <div className="flex items-stretch rounded-md border border-[#e2e8f0] bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.password_placeholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "h-11 sm:h-12 flex-1 min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0 rounded-r-none pr-2 text-base touch-manipulation",
                      "placeholder:text-muted-foreground"
                    )}
                    data-testid="input-password"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 rounded-l-none rounded-r-md text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9]",
                      "touch-manipulation"
                    )}
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? t("auth.hide_password") : t("auth.show_password")}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" /> : <Eye className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />}
                  </Button>
                </div>
              </div>

              {isLockedOut && (
                <div className="flex flex-col gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg" role="alert" data-testid="text-lockout">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{t("auth.too_many_attempts")}</span>
                  </div>
                  <p className="text-xs text-amber-700/90 pl-6">
                    {t("auth.try_again_in")} {formatLockoutRemaining(lockoutRemaining)}
                  </p>
                </div>
              )}

              {error && !isLockedOut && (
                <div className="flex flex-col gap-2 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg" role="alert" data-testid="text-error">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  <p className="text-xs text-red-600/90 pl-6">{t("auth.error_try_again_hint")}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || isLockedOut}
                  className="w-full h-11 sm:h-12 bg-[#2563eb] text-white text-base font-medium touch-manipulation disabled:opacity-70 disabled:pointer-events-none"
                  data-testid="button-login"
                >
                  {isSubmitting ? t("auth.signing_in") : t("auth.signin")}
                </Button>
                {error && !isSubmitting && !isLockedOut && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 sm:h-12 border-[#e2e8f0] text-[#475569] text-base touch-manipulation"
                    onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                    data-testid="button-try-again"
                  >
                    {t("auth.try_again")}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#64748b] mt-4 sm:mt-6 px-2">
          {t("app.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
}

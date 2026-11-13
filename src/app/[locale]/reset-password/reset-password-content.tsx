"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocaleLink } from "@/components/locale-link";
import { createClient } from "@/lib/supabase/client";
import { useDictionary } from "@/lib/i18n/dictionary-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath } from "@/lib/i18n/utils";

// Reached via auth/callback?next=/reset-password, which has already exchanged
// the recovery code for a session. Without a session the link is dead.
export default function ResetPasswordContent() {
  const router = useRouter();
  const supabase = createClient();
  const d = useDictionary().auth;
  const locale = useLocale();

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setHasSession(!!data.user));
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(d.passwordsDontMatch);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage(d.passwordUpdated);
    router.push(localePath("/dashboard", locale));
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{d.newPasswordTitle}</CardTitle>
          <CardDescription>
            {hasSession === false ? d.resetLinkExpired : d.newPasswordDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession === false ? (
            <LocaleLink
              href="/login?forgot=1"
              className="text-sm underline hover:text-foreground"
            >
              {d.forgotPassword}
            </LocaleLink>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{d.newPassword}</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{d.confirmPassword}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || hasSession === null}
              >
                {loading ? d.loading : d.savePassword}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

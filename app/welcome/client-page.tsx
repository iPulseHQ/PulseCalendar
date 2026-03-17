"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Download,
  Users,
  Monitor,
  RefreshCw,
  ListTodo,
  Shield,
  ArrowRight,
  Check,
} from "lucide-react";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  );
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.779.537 1.537 1.168 2.069.63.532 1.458.811 2.342.811.36 0 .724-.052 1.076-.157.652-.195 1.245-.566 1.707-1.074.463.508 1.055.879 1.707 1.074.352.105.716.157 1.076.157.884 0 1.712-.279 2.342-.811.631-.532 1.051-1.29 1.168-2.069.123-.805-.009-1.657-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021z" />
    </svg>
  );
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  assets: ReleaseAsset[];
}

export default function WelcomePage() {
  const t = useTranslations("Welcome");
  const [locale, setLocale] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [release, setRelease] = useState<Release | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(true);
  const [winFormat, setWinFormat] = useState<"msi" | "exe">("msi");

  useEffect(() => {
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(^|; )NEXT_LOCALE=([^;]+)/);
      setLocale(m?.[2] ?? "nl");
    } else {
      setLocale("nl");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchRelease() {
      try {
        const response = await fetch("/api/releases");
        if (response.ok) {
          const data = await response.json();
          setRelease(data);
        }
      } catch {
        // silent
      } finally {
        setLoadingRelease(false);
      }
    }
    fetchRelease();
  }, []);

  const getAsset = (ext: string) =>
    release?.assets.find((a) => a.name.toLowerCase().endsWith(ext.toLowerCase()));

  const formatSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1) + " MB";

  const winAsset = winFormat === "msi"
    ? (getAsset(".msi") || getAsset(".exe"))
    : (getAsset(".exe") || getAsset(".msi"));
  const macAsset = getAsset(".dmg");
  const linuxAsset = getAsset(".AppImage");

  const providers = [
    { name: "Google Calendar", color: "text-blue-500 border-blue-500/30 bg-blue-500/5" },
    { name: "iCloud", color: "text-foreground border-border bg-muted/50" },
    { name: "Microsoft", color: "text-cyan-500 border-cyan-500/30 bg-cyan-500/5" },
    { name: "CalDAV", color: "text-purple-500 border-purple-500/30 bg-purple-500/5" },
  ];

  const features = [
    { icon: Users, key: "multiAccount" as const },
    { icon: Monitor, key: "desktop" as const },
    { icon: RefreshCw, key: "recurring" as const },
    { icon: ListTodo, key: "tasks" as const },
    { icon: Shield, key: "privacy" as const },
  ];

  const steps = [
    { n: "1", key: "step1" as const },
    { n: "2", key: "step2" as const },
    { n: "3", key: "step3" as const },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/icon.svg" alt="PulseCalendar" width={28} height={28} />
            <span className="text-sm font-bold tracking-tight uppercase">{t("brand")}</span>
          </Link>
          <div className="flex items-center gap-2">
            {mounted && (
              <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-xs">
                <button
                  onClick={() => {
                    document.cookie = `NEXT_LOCALE=nl; path=/; max-age=31536000; SameSite=Lax`;
                    window.location.reload();
                  }}
                  className={`rounded px-2 py-1 transition-colors ${locale === "nl" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  NL
                </button>
                <button
                  onClick={() => {
                    document.cookie = `NEXT_LOCALE=en; path=/; max-age=31536000; SameSite=Lax`;
                    window.location.reload();
                  }}
                  className={`rounded px-2 py-1 transition-colors ${locale === "en" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  EN
                </button>
              </div>
            )}
            <Link
              href="/auth/sign-in"
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              {t("getStarted")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)]" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            PulseCalendar by iPulse
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            {t("title")}
            <br />
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {t("titleAccent")}
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-8 text-sm font-semibold text-background transition-all hover:bg-foreground/90"
            >
              {t("getStarted")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-8 text-sm font-semibold text-foreground transition-all hover:bg-muted"
            >
              {t("signIn")}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> {t("features.multiAccountTitle")}</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> {t("features.desktopTitle")}</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> {t("download.title")}</span>
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="border-y border-border bg-muted/20 px-6 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t("providersTitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {providers.map((p) => (
              <span
                key={p.name}
                className={`rounded-xl border px-5 py-2 text-sm font-medium ${p.color}`}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-block rounded-md border border-border bg-muted px-4 py-1 text-sm font-medium">
              {t("how.title")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("how.subtitle")}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.n}
                className="rounded-xl border border-border bg-card p-8 text-center transition-shadow hover:shadow-md"
              >
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-xl font-bold">
                  {step.n}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{t(`how.${step.key}Title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`how.${step.key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/20 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-block rounded-md border border-border bg-card px-4 py-1 text-sm font-medium">
              Features
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Alles wat je nodig hebt
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="mb-1.5 font-semibold">{t(`features.${key}Title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`features.${key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Desktop Download */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-block rounded-md border border-border bg-muted px-4 py-1 text-sm font-medium">
              {t("download.title")}
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("download.subtitle")}
            </h2>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {/* Windows */}
            {loadingRelease ? (
              <div className="h-11 w-44 animate-pulse rounded-lg bg-muted" />
            ) : winAsset ? (
              <div className="flex flex-col items-center gap-2">
                <a
                  href={winAsset.browser_download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <WindowsIcon className="h-4 w-4" />
                  {t("download.windowsLabel")}
                  <span className="text-xs text-muted-foreground">{formatSize(winAsset.size)}</span>
                </a>
                <div className="flex items-center gap-2 text-xs">
                  {(["msi", "exe"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setWinFormat(fmt)}
                      className={`rounded px-2 py-0.5 transition-colors ${winFormat === fmt ? "bg-muted text-foreground border border-border" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      .{fmt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button disabled className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm text-muted-foreground cursor-not-allowed opacity-50">
                <WindowsIcon className="h-4 w-4" />
                {t("download.windowsLabel")}
                <span className="text-xs">{t("download.comingSoon")}</span>
              </button>
            )}

            {/* macOS */}
            {loadingRelease ? (
              <div className="h-11 w-44 animate-pulse rounded-lg bg-muted" />
            ) : macAsset ? (
              <a
                href={macAsset.browser_download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <AppleIcon className="h-4 w-4" />
                {t("download.macLabel")}
                <span className="text-xs opacity-60">{formatSize(macAsset.size)}</span>
              </a>
            ) : (
              <button disabled className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm text-muted-foreground cursor-not-allowed opacity-50">
                <AppleIcon className="h-4 w-4" />
                {t("download.macLabel")}
                <span className="text-xs">{t("download.comingSoon")}</span>
              </button>
            )}

            {/* Linux */}
            {loadingRelease ? (
              <div className="h-11 w-44 animate-pulse rounded-lg bg-muted" />
            ) : linuxAsset ? (
              <a
                href={linuxAsset.browser_download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <LinuxIcon className="h-4 w-4" />
                {t("download.linuxLabel")}
                <span className="text-xs text-muted-foreground">{formatSize(linuxAsset.size)}</span>
              </a>
            ) : (
              <button disabled className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm text-muted-foreground cursor-not-allowed opacity-50">
                <LinuxIcon className="h-4 w-4" />
                {t("download.linuxLabel")}
                <span className="text-xs">{t("download.comingSoon")}</span>
              </button>
            )}
          </div>
          {release && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {t("download.version")}: {release.tag_name}
            </p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/20 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted">
              <Download className="h-7 w-7 text-foreground" />
            </div>
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">{t("cta")}</h2>
            <p className="mx-auto mb-8 max-w-xl text-muted-foreground">{t("ctaDesc")}</p>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-8 py-3 text-sm font-semibold text-background transition-all hover:bg-foreground/90"
            >
              {t("getStarted")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/icon.svg" alt="PulseCalendar" width={24} height={24} />
            <span className="text-sm font-bold tracking-tight uppercase">{t("brand")}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t("privacy")}</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">{t("terms")}</Link>
            <a href="https://ipulse.one" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              {t("madeBy")} iPulse
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

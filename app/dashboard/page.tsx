"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarView, type CalendarViewRef } from "@/components/calendar/calendar-view";
import { useCalendar } from "@/lib/calendar-context";
import { useSettings } from "@/lib/settings-context";
import { useTodos } from "@/hooks/use-todos";
import { useRecurringEvents } from "@/hooks/use-recurring-events";
import { useSession } from "@/lib/auth/client";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
} from "date-fns";
import { Loader2 } from "lucide-react";
import { MigrationPopup } from "@/components/auth/migration-popup";
import { toast } from "sonner";

// LocalStorage cache keys
const EVENTS_CACHE_KEY = "opencalendar_events_cache";
const CACHE_TIMESTAMP_KEY = "opencalendar_cache_timestamp";
const CACHE_EXPIRY = 1000 * 60 * 5; // 5 minutes

function DashboardContent() {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const eventCache = useRef<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncToastId = useRef<string | number | null>(null);
  const {
    currentDate,
    viewType,
    weekStartsOn,
    setCurrentDate,
    setViewType,
    registerCreateEvent,
    registerOpenEvent,
    registerRefreshEvents,
    refreshEvents,
    visibleCalendarIds
  } = useCalendar();
  const { settings } = useSettings();
  const { todos, toggleTodo } = useTodos();

  const optimisticUpdateEvent = useCallback(
    (eventId: string, updates: { startTime: Date; endTime: Date }) => {
      setRawEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, startTime: new Date(updates.startTime), endTime: new Date(updates.endTime) }
            : e
        )
      );
    },
    []
  );

  const optimisticEventRevert = useCallback(() => {
    refreshEvents();
  }, [refreshEvents]);
  const hasSynced = useRef(false);
  const hasInitialized = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);
  const calendarRef = useRef<CalendarViewRef>(null);
  const syncingStartTime = useRef<number>(0);

  // Load cached events immediately on mount for instant feedback
  useEffect(() => {
    try {
      const cached = localStorage.getItem(EVENTS_CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);

        // Use cache even if expired (for instant feedback), but still fetch fresh data
        if (age < CACHE_EXPIRY * 10) { // Keep cache for max 50 minutes
          const cachedEvents = JSON.parse(cached);
          if (Array.isArray(cachedEvents) && cachedEvents.length > 0) {
            setRawEvents(cachedEvents);
            setLoading(false); // Show cached data instantly
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load cached events:", err);
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/sign-in");
    }
  }, [session, isPending, router]);

  // Detect if we just added an account and should start rapid polling
  useEffect(() => {
    if (searchParams.get("syncing") === "true") {
      setIsSyncing(true);
      syncingStartTime.current = Date.now();
      // Clear the URL parameter
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  // Compute visible date range based on current view
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    if (viewType === "day") {
      start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
    } else if (viewType === "week") {
      start = startOfWeek(currentDate, { weekStartsOn });
      end = endOfWeek(currentDate, { weekStartsOn });
    } else {
      // Month view: include overflow weeks
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      start = startOfWeek(monthStart, { weekStartsOn });
      end = endOfWeek(monthEnd, { weekStartsOn });
    }

    // Add 1 day buffer on each side for timezone safety
    return {
      start: addDays(start, -1).toISOString(),
      end: addDays(end, 1).toISOString(),
      startDate: addDays(start, -1),
      endDate: addDays(end, 1),
    };
  }, [currentDate, viewType, weekStartsOn]);

  // Filter events based on visible calendars
  const visibleRawEvents = useMemo(() => {
    return rawEvents.filter((e) => visibleCalendarIds.has(e.calendarId));
  }, [rawEvents, visibleCalendarIds]);

  // Expand recurring events client-side for better performance
  const events = useRecurringEvents(visibleRawEvents, dateRange.startDate, dateRange.endDate);

  const fetchEvents = useCallback(
    async (signal?: AbortSignal) => {
      // Prevent duplicate concurrent fetches (e.g. from isSyncing poll + periodic refresh)
      if (isFetchingRef.current) return 0;
      isFetchingRef.current = true;

      const cacheKey = `${dateRange.start}-${dateRange.end}`;

      // Use in-memory cache for instant feedback if available
      if (eventCache.current.has(cacheKey)) {
        setRawEvents(eventCache.current.get(cacheKey)!);
        setLoading(false);
      }

      try {
        const url = `/api/events?start=${encodeURIComponent(dateRange.start)}&end=${encodeURIComponent(dateRange.end)}`;
        const res = await fetch(url, { signal });

        // Handle authentication errors (expired session)
        if (res.status === 401) {
          toast.error(t("sessionExpired"));
          isFetchingRef.current = false;
          router.push("/auth/sign-in");
          return -1;
        }

        // Handle rate limiting
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
          console.warn(`Rate limited, waiting ${waitSeconds}s`);
          toast.error(t("tooManyRequests", { seconds: waitSeconds }));
          setLoading(false);
          setIsSyncing(false);
          isFetchingRef.current = false;
          return -1;
        }

        // Handle other errors
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Onbekende fout" }));
          toast.error(data.error || `Fout bij ophalen van events (${res.status})`);
          setLoading(false);
          isFetchingRef.current = false;
          return 0;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          // Store raw events (including RRULE metadata)
          setRawEvents(data);
          eventCache.current.set(cacheKey, data);

          // Persist to localStorage for instant loading on next visit
          try {
            localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          } catch (err) {
            console.warn("Failed to cache events to localStorage:", err);
          }

          setLoading(false);
          isFetchingRef.current = false;
          return data.length;
        } else {
          toast.error(t("invalidResponse"));
          setLoading(false);
          isFetchingRef.current = false;
          return 0;
        }
      } catch (err) {
        isFetchingRef.current = false;
        // Ignore abort errors
        if (err instanceof DOMException && err.name === "AbortError") {
          return 0;
        }

        console.error("Fetch events error:", err);
        toast.error(t("networkError"));
        setLoading(false);
        return 0;
      }
    },
    [dateRange, router, t]
  );

  // Check if user has any calendars before syncing
  const hasCalendars = useCallback(async () => {
    try {
      const res = await fetch("/api/calendars");
      if (res.status === 401) {
        router.push("/auth/sign-in");
        return false;
      }
      if (!res.ok) return false;
      const groups = await res.json();
      return Array.isArray(groups) && groups.length > 0;
    } catch {
      return false;
    }
  }, [router]);

  // Auto-sync on first load if no events (background, non-blocking)
  const triggerSync = useCallback(async () => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    // Run sync in background without blocking UI
    (async () => {
      try {
        // First check if there are any calendars
        const calendarsExist = await hasCalendars();
        if (!calendarsExist) {
          console.log("No calendars found, skipping sync");
          return;
        }

        const res = await fetch("/api/calendars");

        if (res.status === 401) {
          router.push("/auth/sign-in");
          return;
        }

        if (!res.ok) return;

        const groups = await res.json();
        if (!Array.isArray(groups)) return;

        // Sync all accounts in parallel (max 3 at a time to avoid rate limits)
        const nonLocalGroups = groups.filter(group => group.provider !== "local");
        if (nonLocalGroups.length === 0) return;

        // Sync in batches of 3 to avoid overwhelming the server
        for (let i = 0; i < nonLocalGroups.length; i += 3) {
          const batch = nonLocalGroups.slice(i, i + 3);
          const syncPromises = batch.map(group => {
            // Map provider to endpoint
            let endpoint: string;
            switch (group.provider) {
              case "google":
                endpoint = `/api/sync/google?accountId=${group.id}`;
                break;
              case "microsoft":
                endpoint = "/api/sync/microsoft/callback";
                break;
              case "icloud":
                endpoint = "/api/sync/icloud";
                break;
              case "caldav":
                endpoint = "/api/sync/caldav";
                break;
              default:
                console.warn(`Unknown provider: ${group.provider}`);
                return Promise.resolve();
            }

            return fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "sync", accountId: group.id }),
            }).catch((err) => {
              console.warn(`Sync failed for ${group.provider}:`, err);
            });
          });
          await Promise.all(syncPromises);
          // Small delay between batches
          if (i + 3 < nonLocalGroups.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Refetch events after sync completes
        await fetchEvents();
      } catch (err) {
        console.error("Trigger sync error:", err);
      }
    })();
  }, [fetchEvents, router, hasCalendars]);

  // Fetch events when date range changes or session becomes available
  useEffect(() => {
    if (isPending || !session) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const init = async () => {
      // Check if we have cached data (only check once)
      const hasCachedData = rawEvents.length > 0;

      // Start fetching events immediately (will use cache if available)
      const fetchPromise = fetchEvents(controller.signal);

      // If we already have cached data showing, don't block on fetch
      if (hasCachedData) {
        // Fetch in background
        fetchPromise.then(count => {
          // Only trigger sync if we got 0 NEW events (not -1 which means error)
          if (count === 0 && !hasSynced.current) {
            triggerSync();
          }
        });
      } else {
        // No cached data, wait for fetch before triggering sync
        const count = await fetchPromise;
        // Only trigger sync if we got 0 events (not -1 which means error)
        if (count === 0 && !hasSynced.current) {
          triggerSync();
        }
      }

      hasInitialized.current = true;
    };
    init();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEvents, triggerSync, session, isPending]);

  // Show/hide syncing toast
  useEffect(() => {
    if (isSyncing) {
      syncToastId.current = toast.loading(t("syncing"), { duration: Infinity });
    } else {
      if (syncToastId.current !== null) {
        toast.dismiss(syncToastId.current);
        syncToastId.current = null;
      }
    }
  }, [isSyncing, t]);

  // Rapid polling during initial sync - max 15 attempts with exponential backoff
  useEffect(() => {
    if (!isSyncing) return;

    let pollCount = 0;
    const maxPolls = 15;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const pollEvents = async () => {
      if (isCancelled || pollCount >= maxPolls) {
        setIsSyncing(false);
        return;
      }

      pollCount++;
      const eventCount = await fetchEvents();

      if (eventCount > 0 || eventCount === -1) {
        setTimeout(() => setIsSyncing(false), 3000);
        return;
      }

      const delay = Math.min(2000 * Math.pow(2, Math.floor((pollCount - 1) / 3)), 10000);

      if (pollCount < maxPolls) {
        timeoutId = setTimeout(pollEvents, delay);
      } else {
        setIsSyncing(false);
      }
    };

    timeoutId = setTimeout(pollEvents, 1000);

    const safetyTimeout = setTimeout(() => {
      isCancelled = true;
      setIsSyncing(false);
    }, 60000);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(safetyTimeout);
    };
  }, [isSyncing, fetchEvents]);

  // Periodic refresh
  useEffect(() => {
    if (isSyncing) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (interval) return;
      interval = setInterval(() => fetchEvents(), 300_000);
    };

    const stopInterval = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        fetchEvents();
        startInterval();
      }
    };

    if (!document.hidden) startInterval();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchEvents, isSyncing]);

  useEffect(() => {
    if (calendarRef.current) {
      registerCreateEvent(() => calendarRef.current?.openCreateModal());
      registerOpenEvent((eventId) => calendarRef.current?.openEventModal(eventId));
    }
    registerRefreshEvents(() => fetchEvents());
  }, [registerCreateEvent, registerOpenEvent, registerRefreshEvents, fetchEvents]);

  // Open event modal when eventId in URL (bijv. van Source-link bij geplande taak)
  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (eventId && calendarRef.current && !loading) {
      calendarRef.current.openEventModal(eventId);
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, loading, router]);

  return (
    <>
      <MigrationPopup />

      <CalendarView
        ref={calendarRef}
        currentDate={currentDate}
        viewType={viewType}
        events={events}
        rawEvents={rawEvents}
        todos={todos}
        onEventsChange={() => fetchEvents()}
        onDateChange={setCurrentDate}
        onViewTypeChange={setViewType}
        onToggleTodo={toggleTodo}
        onOptimisticEventUpdate={optimisticUpdateEvent}
        onOptimisticEventRevert={optimisticEventRevert}
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

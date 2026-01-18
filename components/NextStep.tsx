/**
 * ============================================================
 * 📄 FILE: frontend/components/NextStep.tsx
 * ============================================================
 *
 * 🎯 PURPOSE:
 *    "Your Next Step" screen with calm, actionable guidance.
 *
 * 🛠️ TECH USED:
 *    - React
 *    - shadcn/ui components
 *
 * ============================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import type { ChatResponse, ProfileUpdate } from '@/lib/api';

interface NextStepProps {
  userId: string;
}

type StoredChatState = {
  profile?: ProfileUpdate | null;
  itinerary?: ChatResponse['itinerary'] | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatInterestLabel(label: string): string {
  if (!label) return '';
  return label
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function NextStep({ userId }: NextStepProps) {
  const [profile, setProfile] = useState<ProfileUpdate | null>(null);
  const [itinerary, setItinerary] = useState<ChatResponse['itinerary'] | null>(null);
  const storageKey = useMemo(() => `takoa_chat_state_${userId}`, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as StoredChatState;
      setProfile(parsed.profile ?? null);
      setItinerary(parsed.itinerary ?? null);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const extraversion = profile?.traits.extraversion ?? 0.5;
  const groupIndicator = clamp(extraversion * 100, 10, 90);
  const interactionIndicator = clamp((1 - extraversion) * 100, 10, 90);

  const interactionLabel =
    extraversion >= 0.62 ? 'More spontaneous than reflective.' :
    extraversion <= 0.38 ? 'More reflective than spontaneous.' :
    'Balanced between reflective and spontaneous.';

  const groupLabel =
    extraversion >= 0.7 ? 'Comfortable in larger groups.' :
    extraversion <= 0.4 ? 'Prefers small groups in low-pressure settings.' :
    'Leans toward smaller groups with room to talk.';

  const topInterests = useMemo(() => {
    if (!profile?.interests) return [];
    return Object.entries(profile.interests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([interest]) => formatInterestLabel(interest));
  }, [profile]);

  const hasPlan = Boolean(itinerary?.wednesday_study || itinerary?.friday_social);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 step-enter">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Image src="/stickman.png" alt="Info" width={16} height={16} className="h-4 w-4" />
          Here&apos;s how the system currently sees you — this updates as you talk.
        </div>
        <p className="text-xs text-muted-foreground italic opacity-70">
          This view updates as we get to know you.
        </p>
      </div>

      {/* Section 1 — Snapshot (Input) */}
      <Card className="transition-shadow hover:shadow-md step-enter-delay">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-bold">Your Social Snapshot</CardTitle>
          <p className="text-sm text-muted-foreground">Current system readout.</p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-2 rounded-xl border border-border/50 p-3">
            <p className="text-xs font-semibold">Interaction style</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Reflective</span>
              <span className="flex-1 border-t border-border" />
              <span>Spontaneous</span>
            </div>
            <div className="relative h-3">
              <span
                className="absolute -top-1 text-xs indicator-float"
                style={{ left: `${interactionIndicator}%` }}
              >
                ▲
              </span>
            </div>
            <p>{interactionLabel}</p>
          </div>

          <div className="space-y-2 rounded-xl border border-border/50 p-3">
            <p className="text-xs font-semibold">Group preference</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Solo</span>
              <span className="flex-1 border-t border-border" />
              <span>Small groups</span>
              <span className="flex-1 border-t border-border" />
              <span>Large groups</span>
            </div>
            <div className="relative h-3">
              <span
                className="absolute -top-1 text-xs indicator-float"
                style={{ left: `${groupIndicator}%` }}
              >
                ▲
              </span>
            </div>
            <p>{groupLabel}</p>
          </div>

          <div className="space-y-2 rounded-xl border border-border/50 p-3">
            <p className="text-xs font-semibold">Top interests</p>
            {topInterests.length > 0 ? (
              <>
                <p>Based on what you’ve shared so far.</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {topInterests.map(interest => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="transition-transform hover:-translate-y-[1px]"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p>Keep chatting so we can surface your top interests.</p>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-border/50 p-3">
            <p className="text-xs font-semibold">System context</p>
            <p>
              {profile?.confidence && profile.confidence >= 0.8
                ? 'We have a stable picture of how you engage socially.'
                : 'We’re still building a clearer picture of your style.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
        <ArrowDown className="h-3 w-3" />
        How this shapes your group.
      </div>

      {/* Section 3 — Plan (Outcome) */}
      <Card className="transition-shadow hover:shadow-md step-enter-delay-2">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-bold">Plan</CardTitle>
          <p className="text-sm text-muted-foreground">Designed for this group.</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm p-4 pt-0 sm:p-6 sm:pt-0">
          {hasPlan ? (
            <>
              <div>
                <p className="text-base font-semibold">
                  {itinerary?.friday_social?.theme || itinerary?.wednesday_study?.theme || 'Plan overview'}
                </p>
                <p className="text-muted-foreground">
                  Built from your latest signals and group fit.
                </p>
              </div>
              <div className="space-y-3">
                {itinerary?.wednesday_study && (
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Wednesday</p>
                    <p className="font-medium">{itinerary.wednesday_study.location_hint}</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {itinerary.wednesday_study.plan.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {itinerary?.friday_social && (
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Friday (optional)</p>
                    <p className="font-medium">{itinerary.friday_social.location_hint}</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {itinerary.friday_social.plan.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <ol className="list-decimal pl-4 space-y-2">
                <li>Say hello in the circle chat.</li>
                <li>Pick one shared interest to start with.</li>
                <li>Meet at the common spot; keep it short and easy.</li>
              </ol>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Your role</p>
                <p>You’ll kick off the first group message.</p>
              </div>
              <Button variant="outline" size="sm">
                Need help?
              </Button>
            </>
          ) : (
            <div className="rounded-lg border border-border px-3 py-3 text-sm text-muted-foreground">
              Keep chatting and we’ll generate a detailed plan with times and locations.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — Group cohesion signals */}
      <Card className="transition-shadow hover:shadow-md step-enter-delay-2">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-bold">Group cohesion signals</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2 p-4 pt-0 sm:p-6 sm:pt-0">
          <p>Aligned energy levels.</p>
          <p>Overlapping interests.</p>
          <p>Balanced conversation dynamics.</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * ============================================================
 * 📄 FILE FOOTER: frontend/components/NextStep.tsx
 * ============================================================
 * PURPOSE:
 *    Calm, actionable “Your Next Step” screen.
 * TECH USED:
 *    - React
 *    - shadcn/ui
 * ============================================================
 */

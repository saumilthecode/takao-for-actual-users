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

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

export default function NextStep() {
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
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg font-bold">Your Social Snapshot</CardTitle>
          <p className="text-sm text-muted-foreground">Current system readout.</p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div className="space-y-2 rounded-xl border border-border/50 p-3">
            <p className="text-xs font-semibold">Interaction style</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Reflective</span>
              <span className="flex-1 border-t border-border" />
              <span>Spontaneous</span>
            </div>
            <div className="relative h-3">
              <span className="absolute left-[20%] -top-1 text-xs indicator-float">▲</span>
            </div>
            <p>More reflective than spontaneous.</p>
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
              <span className="absolute left-[45%] -top-1 text-xs indicator-float">▲</span>
            </div>
            <p>Prefers small groups in low-pressure settings.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-border/50 p-3">
            <p className="text-xs font-semibold">Top interests</p>
            <p>Often gravitates toward AI discussions, casual sports, and quiet café sessions.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge
                variant="secondary"
                title="Often shows up in conversations."
                className="transition-transform hover:-translate-y-[1px]"
              >
                AI
              </Badge>
              <Badge
                variant="secondary"
                title="Prefers relaxed social settings."
                className="transition-transform hover:-translate-y-[1px]"
              >
                Cafés
              </Badge>
              <Badge
                variant="secondary"
                title="Energy is best in low-pressure groups."
                className="transition-transform hover:-translate-y-[1px]"
              >
                Casual sports
              </Badge>
              <Badge
                variant="secondary"
                title="Likes structured meetups."
                className="transition-transform hover:-translate-y-[1px]"
              >
                Study sessions
              </Badge>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border/50 p-3">
            <p className="text-xs font-semibold">System context</p>
            <p>We have a stable picture of how you engage socially.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
        <ArrowDown className="h-3 w-3" />
        How this shapes your group.
      </div>

      {/* Section 3 — Plan (Outcome) */}
      <Card className="transition-shadow hover:shadow-md step-enter-delay-2">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg font-bold">System-Generated Plan</CardTitle>
          <p className="text-sm text-muted-foreground">Designed for this group.</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-base font-semibold">Low-pressure coffee + interest sync</p>
            <p className="text-muted-foreground">
              Chosen because your group prefers relaxed, small-setting interactions.
            </p>
          </div>
          <ol className="list-decimal pl-4 space-y-2">
            <li>Say hello in the circle chat.</li>
            <li>Pick one shared interest to start with.</li>
            <li>Meet for a short, no-pressure hang.</li>
          </ol>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your role</p>
            <p>You’ll kick off the first group message.</p>
          </div>
          <Button variant="outline" size="sm">
            Need help?
          </Button>
        </CardContent>
      </Card>

      {/* Section 4 — Group cohesion signals */}
      <Card className="transition-shadow hover:shadow-md step-enter-delay-2">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg font-bold">Group cohesion signals</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
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

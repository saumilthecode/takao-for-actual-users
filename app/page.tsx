/**
 * ============================================================
 * 📄 FILE: frontend/app/page.tsx
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Main page with tabs for Chat and Space (3D graph).
 * 
 * 🛠️ TECH USED:
 *    - Next.js 14 App Router (client component)
 *    - Radix UI Tabs
 *    - Lucide icons
 * 
 * ============================================================
 */

'use client';

import { useState, useId, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Compass, Lock } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import OnboardingForm from '@/components/OnboardingForm';
import { ChatResponse, UserProfile } from '@/lib/api';
import NextStep from '@/components/NextStep';

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const reactId = useId();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileConfidence, setProfileConfidence] = useState(0);
  const [itinerary, setItinerary] = useState<ChatResponse['itinerary'] | null>(null);
  const sessionUserId = useMemo(
    () => `user_${reactId.replace(/[:]/g, '')}`,
    [reactId]
  );

  useEffect(() => {
    const stored = window.localStorage.getItem('takoa_user');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as UserProfile;
      if (parsed?.id) {
        setUserProfile(parsed);
      }
    } catch {
      window.localStorage.removeItem('takoa_user');
    }
  }, []);

  const handleProfileChange = (profile: { confidence: number } | null) => {
    setProfileConfidence(profile?.confidence ?? 0);
  };

  const handleItineraryChange = (nextItinerary: ChatResponse['itinerary'] | null) => {
    setItinerary(nextItinerary);
  };

  const handleOnboardingComplete = (user: UserProfile) => {
    setUserProfile(user);
    window.localStorage.setItem('takoa_user', JSON.stringify(user));
  };

  const isUnlocked = profileConfidence >= 0.8;

  const meetingLocation = itinerary?.wednesday_study?.location_hint
    || itinerary?.friday_social?.location_hint
    || '';
  const meetingLink = meetingLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingLocation)}`
    : '/';

  useEffect(() => {
    if (!isUnlocked && activeTab !== 'chat') {
      setActiveTab('chat');
    }
  }, [activeTab, isUnlocked]);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <a
            href={isUnlocked ? meetingLink : '/'}
            className="flex items-center gap-2 min-w-0"
            aria-label="Takoa"
          >
            <Image src="/stickman.png" alt="Takoa" width={24} height={24} className="h-6 w-6" />
            <h1 className="text-lg font-bold sm:text-xl">Takoa</h1>
            <span className="text-muted-foreground text-xs sm:text-sm ml-1.5 sm:ml-2 truncate">
              Find Your People
            </span>
          </a>
          <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground shrink-0">
            <Link
              href="/about"
              className="font-semibold underline decoration-2 underline-offset-4 transition-colors hover:text-foreground"
            >
              About
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 flex-1 w-full">
        {userProfile ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md h-11 sm:h-10">
              <TabsTrigger value="chat" className="flex items-center gap-2 shadow-md text-xs sm:text-sm py-2.5 sm:py-1.5">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="next" className="flex items-center gap-2 text-xs sm:text-sm py-2.5 sm:py-1.5" disabled={!isUnlocked}>
                {isUnlocked ? <Compass className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                Next Step
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-6">
              <ChatInterface
                userId={userProfile.id || sessionUserId}
                userName={userProfile.name}
                onProfileChange={handleProfileChange}
                onItineraryChange={handleItineraryChange}
              />
            </TabsContent>

            <TabsContent value="next" className="mt-6">
              <NextStep userId={userProfile.id || sessionUserId} />
            </TabsContent>
          </Tabs>
        ) : (
          <OnboardingForm onComplete={handleOnboardingComplete} />
        )}
      </div>

      <footer className="mt-auto px-4 py-3 text-center text-xs text-muted-foreground sm:hidden">
        made by{' '}
        <a
          href="https://github.com/716r5"
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Ankita
        </a>{' '}
        and{' '}
        <a
          href="https://github.com/saumilthecode"
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Saumil
        </a>
      </footer>
    </main>
  );
}

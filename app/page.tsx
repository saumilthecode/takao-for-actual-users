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
import { MessageSquare, Globe } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import SocialGraph from '@/components/SocialGraph';
import OnboardingForm from '@/components/OnboardingForm';
import { UserProfile } from '@/lib/api';

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);
  const reactId = useId();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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

  const handleProfileUpdate = () => {
    // Trigger graph refresh when chat updates profile
    setGraphRefreshKey(prev => prev + 1);
  };

  const handleOnboardingComplete = (user: UserProfile) => {
    setUserProfile(user);
    window.localStorage.setItem('takoa_user', JSON.stringify(user));
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Image src="/stickman.png" alt="Takoa" width={24} height={24} className="h-6 w-6" />
            <h1 className="text-xl font-bold">Takoa</h1>
            <span className="text-muted-foreground text-sm ml-2">Find Your People</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
      <div className="max-w-7xl mx-auto p-6">
        {userProfile ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="chat" className="flex items-center gap-2 shadow-md">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="space" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Space
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-6">
              <ChatInterface
                userId={userProfile.id || sessionUserId}
                userName={userProfile.name}
                onProfileUpdate={handleProfileUpdate}
              />
            </TabsContent>

            <TabsContent value="space" className="mt-6">
              <SocialGraph key={graphRefreshKey} focusUserId={userProfile.id || sessionUserId} />
            </TabsContent>
          </Tabs>
        ) : (
          <OnboardingForm onComplete={handleOnboardingComplete} />
        )}
      </div>

    </main>
  );
}

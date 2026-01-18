/**
 * ============================================================
 * 📄 FILE: frontend/components/ChatInterface.tsx
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Chat UI for onboarding conversations.
 *    User talks to bot, bot extracts conversational signals.
 *    Shows real-time profile updates (vector visualization).
 * 
 * 🛠️ TECH USED:
 *    - React state management
 *    - shadcn/ui components (Card, Input, Button, ScrollArea)
 *    - API client for backend communication
 *    - Lucide icons
 * 
 * 📊 FEATURES:
 *    - Message history display
 *    - Typing indicator
 *    - Real-time trait visualization (bar chart)
 *    - Quick reset action
 * 
 * ============================================================
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Send, Bot, User, Loader2, RotateCcw } from 'lucide-react';
import { sendChatMessage, ChatMessage, ProfileUpdate, ChatResponse, SessionState } from '@/lib/api';

interface ChatInterfaceProps {
  userId: string;
  userName?: string;
  onProfileUpdate?: () => void;
  onProfileChange?: (profile: ProfileUpdate | null) => void;
}

export default function ChatInterface({
  userId,
  userName,
  onProfileUpdate,
  onProfileChange
}: ChatInterfaceProps) {
  const introMessage = userName
    ? `Hey ${userName}, let's get to know your vibe. What kind of people do you feel most at ease with?`
    : "Hey, let's get to know your vibe. What kind of people do you feel most at ease with?";
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: introMessage
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileUpdate | null>(null);
  const [planVisible, setPlanVisible] = useState(false);
  const [itinerary, setItinerary] = useState<ChatResponse['itinerary'] | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTimeouts = useRef<number[]>([]);
  const storageKey = `takoa_chat_state_${userId}`;

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const clearPendingTimeouts = useCallback(() => {
    pendingTimeouts.current.forEach(timeoutId => window.clearTimeout(timeoutId));
    pendingTimeouts.current = [];
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    onProfileChange?.(profile);
  }, [onProfileChange, profile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        messages?: ChatMessage[];
        profile?: ProfileUpdate | null;
        planVisible?: boolean;
        itinerary?: ChatResponse['itinerary'] | null;
        sessionState?: SessionState | null;
      };
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        setMessages(parsed.messages);
      }
      if (parsed.profile) {
        setProfile(parsed.profile);
      }
      if (typeof parsed.planVisible === 'boolean') {
        setPlanVisible(parsed.planVisible);
      }
      if (parsed.itinerary) {
        setItinerary(parsed.itinerary);
      }
      if (parsed.sessionState) {
        setSessionState(parsed.sessionState);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      messages,
      profile,
      planVisible,
      itinerary,
      sessionState
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [storageKey, messages, profile, planVisible, itinerary, sessionState]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    return () => clearPendingTimeouts();
  }, [clearPendingTimeouts]);

  const scheduleAssistantMessages = useCallback((assistantMessages: string[]) => {
    let delay = 0;
    assistantMessages.forEach(message => {
      const step = 400 + Math.random() * 400;
      delay += step;
      const timeoutId = window.setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: message }]);
      }, delay);
      pendingTimeouts.current.push(timeoutId);
    });
  }, []);

  const isChatReady = true;

  const handleSend = useCallback(async () => {
    if (!isChatReady || !input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    inputRef.current?.focus();
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userId, userMessage, messages, sessionState);
      const fallbackMessage = (response as { assistantMessage?: string }).assistantMessage;
      const assistantMessages = response.assistantMessages?.length
        ? response.assistantMessages
        : [fallbackMessage || "Tell me more about that."];
      scheduleAssistantMessages(assistantMessages);

      if (response.itinerary) {
        setItinerary(response.itinerary);
        setPlanVisible(true);
      } else if (response.done) {
        setPlanVisible(true);
      }

      if (response.sessionState) {
        setSessionState(response.sessionState);
      }
      
      // Update profile with smooth transition
      if (response.profileUpdate) {
        setProfile(prev => {
          if (!prev) return response.profileUpdate;
          // Blend old and new for smooth updates
          return {
            traits: {
              openness: response.profileUpdate.traits.openness,
              conscientiousness: response.profileUpdate.traits.conscientiousness,
              extraversion: response.profileUpdate.traits.extraversion,
              agreeableness: response.profileUpdate.traits.agreeableness,
              neuroticism: response.profileUpdate.traits.neuroticism,
            },
            interests: { ...prev.interests, ...response.profileUpdate.interests },
            confidence: Math.max(prev.confidence, response.profileUpdate.confidence)
          };
        });
        
        // Notify parent that profile was updated (triggers graph refresh)
        if (response.profileUpdate.confidence > 0.1) {
          onProfileUpdate?.();
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Hmm, I'm having trouble processing that right now. Could you try rephrasing?" 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isChatReady, messages, onProfileUpdate, scheduleAssistantMessages, sessionState, userId]);

  const handleReset = useCallback(() => {
    clearPendingTimeouts();
    setMessages([{
      role: 'assistant',
      content: introMessage
    }]);
    setProfile(null);
    setInput('');
    setPlanVisible(false);
    setItinerary(null);
    setSessionState(null);
    inputRef.current?.focus();
  }, [clearPendingTimeouts, introMessage]);

  const studyPlan = itinerary?.wednesday_study;
  const socialPlan = itinerary?.friday_social;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Chat Window */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Signal Chat
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isLoading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Messages */}
          <ScrollArea className="h-[55vh] sm:h-[450px] pr-3 sm:pr-4">
            <div className="space-y-4 pr-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <Bot className="h-5 w-5" />
                    )}
                  </div>
                  <div className={`max-w-[75%] rounded-lg px-4 py-3 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="bg-secondary rounded-lg px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2 mt-3">
            <Input
              ref={inputRef}
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading}
              className="flex-1 text-sm"
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              size="icon"
              className="shrink-0 opacity-100"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Panel (Vector Visualization) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Image src="/stickman.png" alt="Signal" width={16} height={16} className="h-4 w-4" />
            Your Signal Profile
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Real-time signal insights
          </p>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-5">
              {/* Interests */}
              {Object.keys(profile.interests).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Detected Interests
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(profile.interests)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([interest, weight]) => (
                        <Badge 
                          key={interest} 
                          variant="secondary"
                          className="text-xs"
                        >
                          {interest}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Signal Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${profile.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono text-primary font-semibold">
                      {(profile.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  You’ll unlock the rest of the app once your confidence reaches 80%.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Image src="/stickman.png" alt="Signal" width={32} height={32} className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Start chatting to build your signal profile</p>
              <p className="text-xs mt-2 opacity-75">We extract conversational signals from your responses</p>
            </div>
          )}
        </CardContent>
      </Card>

      {planVisible && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Plan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Shared with 4 other users (circle of 5)
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {studyPlan ? (
              <div>
                <p className="font-medium">{studyPlan.theme}</p>
                <p className="text-muted-foreground">{studyPlan.location_hint}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {studyPlan.plan.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground">We’re preparing your group’s plan.</p>
            )}
            {socialPlan && (
              <div>
                <p className="font-medium">{socialPlan.theme}</p>
                <p className="text-muted-foreground">{socialPlan.location_hint}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {socialPlan.plan.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * ============================================================
 * 📄 FILE FOOTER: frontend/components/ChatInterface.tsx
 * ============================================================
 * PURPOSE:
 *    Onboarding chat UI with delayed multi-bubble responses.
 * TECH USED:
 *    - React
 *    - shadcn/ui
 * ============================================================
 */

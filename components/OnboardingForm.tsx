/**
 * Simple onboarding form to create a user profile.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createUser, UserProfile } from '@/lib/api';

interface OnboardingFormProps {
  onComplete: (user: UserProfile) => void;
}

export default function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [uni, setUni] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const parsedAge = Number(age);
    if (!name.trim() || !uni.trim() || !Number.isFinite(parsedAge) || parsedAge <= 0) {
      setError('Please enter your name, age, and university.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { user } = await createUser({
        name: name.trim(),
        age: parsedAge,
        uni: uni.trim()
      });
      onComplete(user);
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Could not create your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Welcome to Takoa</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tell us a bit about you to start matching you with your circle.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Age</label>
              <Input
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\\D/g, ''))}
                placeholder="20"
                inputMode="numeric"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">University</label>
              <Input
                value={uni}
                onChange={(e) => setUni(e.target.value)}
                placeholder="Your university"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating profile...' : 'Start chatting'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

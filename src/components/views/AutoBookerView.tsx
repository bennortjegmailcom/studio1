"use client";

import React, { useState, useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { analyzeHistorianData } from '@/ai/flows/analyze-historian-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bot, Wand2 } from 'lucide-react';

export default function AutoBookerView() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const [historianData, setHistorianData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedEvents, setSuggestedEvents] = useState<string[]>([]);

  if (!context) return <div>Loading...</div>;
  const { data } = context;

  const handleAnalyze = async () => {
    if (!historianData.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Historian data cannot be empty.',
      });
      return;
    }

    setIsLoading(true);
    setSuggestedEvents([]);

    try {
      const equipmentList = data.equipment.map(e => e.name);
      const historianTags = data.equipment.flatMap(e => e.historianTags);

      const result = await analyzeHistorianData({
        historianData,
        equipmentList,
        historianTags,
      });

      setSuggestedEvents(result.suggestedDowntimeEvents);
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'An error occurred while analyzing the data. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>AI Auto Booker</CardTitle>
          <CardDescription>
            Paste raw text from your historian system. The AI will analyze it to suggest downtime events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full gap-2">
            <Label htmlFor="historian-data">Historian Data</Label>
            <Textarea
              id="historian-data"
              placeholder="Paste your historian data here..."
              rows={15}
              value={historianData}
              onChange={(e) => setHistorianData(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAnalyze} disabled={isLoading}>
            {isLoading ? 'Analyzing...' : <> <Wand2 className="mr-2 h-4 w-4"/> Analyze Data</>}
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Suggested Events</CardTitle>
          <CardDescription>
            Review the suggestions below. Click an event to create a booking (feature coming soon).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center p-8">
                <Bot className="w-8 h-8 animate-spin" />
            </div>
          )}
          {!isLoading && suggestedEvents.length === 0 && (
            <div className="text-center text-muted-foreground p-8">
              No suggestions yet. Paste data and click analyze.
            </div>
          )}
          {suggestedEvents.length > 0 && (
            <ul className="space-y-2">
              {suggestedEvents.map((event, index) => (
                <li key={index} className="p-3 bg-secondary rounded-md text-sm">
                  {event}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

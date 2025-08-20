"use client";

import React, { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export default function MeetingView() {
  const context = useContext(AppContext);
  if (!context) return <div>Loading...</div>;

  const { data, today } = context;
  const bookingsToday = data.bookings.filter(b => b.date === today);

  const handleExport = () => {
    let textContent = `Downtime Report for ${today}\n\n`;
    
    data.equipment.forEach(eq => {
      const equipmentBookings = bookingsToday.filter(b => b.equipmentId === eq.id)
        .sort((a, b) => a.startTime - b.startTime);
      
      if (equipmentBookings.length > 0) {
        textContent += `--- ${eq.name} ---\n`;
        equipmentBookings.forEach(b => {
          const system = data.systems.find(s => s.id === b.systemId)?.name || 'N/A';
          const section = data.sections.find(s => s.id === b.sectionId)?.name || 'N/A';
          const fault = data.faults.find(f => f.id === b.faultId)?.name || 'N/A';
          const duration = b.endTime - b.startTime;
          
          textContent += `Time: ${formatTime(b.startTime)} - ${formatTime(b.endTime)} (${duration} mins)\n`;
          textContent += `System: ${system}\n`;
          textContent += `Section: ${section}\n`;
          textContent += `Fault: ${fault}\n`;
          textContent += `Comments: ${b.comments}\n\n`;
        });
      }
    });

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `downtime-report-${today}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting Summary</CardTitle>
      </CardHeader>
      <ScrollArea className="h-[calc(100vh-280px)]">
        <CardContent>
            <div className="space-y-4">
            {data.equipment.map(eq => (
                <div key={eq.id}>
                <h3 className="font-semibold mb-2">{eq.name}</h3>
                <div className="relative w-full h-8 bg-secondary rounded-full overflow-hidden">
                    {bookingsToday
                    .filter(b => b.equipmentId === eq.id)
                    .map(booking => {
                        const left = (booking.startTime / (24 * 60)) * 100;
                        const width = ((booking.endTime - booking.startTime) / (24 * 60)) * 100;
                        const section = data.sections.find(s => s.id === booking.sectionId);
                        
                        return (
                        <div
                            key={booking.id}
                            className="absolute h-full"
                            style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: section?.color || 'gray',
                            }}
                            title={`${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`}
                        ></div>
                        );
                    })}
                </div>
                </div>
            ))}
            </div>
        </CardContent>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
      <CardFooter>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export as .txt
        </Button>
      </CardFooter>
    </Card>
  );
}

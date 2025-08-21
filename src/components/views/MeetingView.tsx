
"use client";

import React, { useContext, useState, useMemo } from 'react';
import type { Booking } from '@/lib/types';
import { AppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}min`;
}

export default function MeetingView() {
  const context = useContext(AppContext);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  if (!context) return <div>Loading...</div>;

  const { data, today } = context;
  const bookingsToday = data.bookings.filter(b => b.date === today);

  const dailyTotalsByResponsibility = useMemo(() => {
    const totals: Record<string, number> = {};
    bookingsToday.forEach(booking => {
        const duration = booking.endTime - booking.startTime;
        if (totals[booking.responsibilityId]) {
            totals[booking.responsibilityId] += duration;
        } else {
            totals[booking.responsibilityId] = duration;
        }
    });
    return totals;
  }, [bookingsToday]);

  const areasWithEquipment = useMemo(() => {
    return data.areas.map(area => ({
        ...area,
        equipment: data.relations.areaToEquipment?.[area.id]?.map(eqId => 
            data.equipment.find(eq => eq.id === eqId)
        ).filter((eq): eq is NonNullable<typeof eq> => eq != null) || []
    }));
  }, [data.areas, data.equipment, data.relations.areaToEquipment]);

  const handleExport = () => {
    let textContent = `Downtime Report for ${today}\n\n`;
    
    areasWithEquipment.forEach(area => {
        textContent += `====== AREA: ${area.name} ======\n\n`;
        area.equipment.forEach(eq => {
            const equipmentBookings = bookingsToday.filter(b => b.equipmentId === eq.id)
                .sort((a, b) => a.startTime - b.startTime);
            
            if (equipmentBookings.length > 0) {
                textContent += `--- ${eq.name} ---\n`;
                equipmentBookings.forEach(b => {
                const system = data.systems.find(s => s.id === b.systemId)?.name || 'N/A';
                const responsibility = data.responsibilities.find(r => r.id === b.responsibilityId)?.name || 'N/A';
                const fault = data.faults.find(f => f.id === b.faultId)?.name || 'N/A';
                const duration = b.endTime - b.startTime;
                
                textContent += `Time: ${formatTime(b.startTime)} - ${formatTime(b.endTime)} (${duration} mins)\n`;
                textContent += `System: ${system}\n`;
                textContent += `Responsibility: ${responsibility}\n`;
                textContent += `Fault: ${fault}\n`;
                textContent += `Comments: ${b.comments || 'None'}\n\n`;
                });
            }
        });
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

  const selectedBookingDetails = useMemo(() => {
    if (!selectedBooking) return null;
    const responsibility = data.responsibilities.find(r => r.id === selectedBooking.responsibilityId);
    const system = data.systems.find(s => s.id === selectedBooking.systemId);
    const fault = data.faults.find(f => f.id === selectedBooking.faultId);
    const equipment = data.equipment.find(e => e.id === selectedBooking.equipmentId);

    return {
        responsibility,
        system,
        fault,
        equipment,
        duration: selectedBooking.endTime - selectedBooking.startTime,
        totalForDay: responsibility ? dailyTotalsByResponsibility[responsibility.id] : 0,
    };
  }, [selectedBooking, data, dailyTotalsByResponsibility]);

  return (
    <div className="grid lg:grid-cols-3 gap-4 h-full">
        <Card className="lg:col-span-2 flex flex-col">
        <CardHeader>
            <CardTitle>Meeting Summary Timeline</CardTitle>
            <CardDescription>Hover for details, click for an expanded report.</CardDescription>
        </CardHeader>
        <TooltipProvider delayDuration={100}>
            <ScrollArea className="flex-grow">
            <CardContent className="h-full">
                <div className="space-y-6">
                {areasWithEquipment.map(area => (
                    <div key={area.id}>
                        <h2 className="text-lg font-bold mb-3">{area.name}</h2>
                        <div className="space-y-4 pl-4 border-l-2">
                            {area.equipment.map(eq => (
                                <div key={eq.id}>
                                <h3 className="font-semibold mb-2">{eq.name}</h3>
                                <div className="relative w-full h-8 bg-secondary rounded-full overflow-hidden">
                                    {bookingsToday
                                    .filter(b => b.equipmentId === eq.id)
                                    .map(booking => {
                                        const left = (booking.startTime / (24 * 60)) * 100;
                                        const width = ((booking.endTime - booking.startTime) / (24 * 60)) * 100;
                                        const responsibility = data.responsibilities.find(r => r.id === booking.responsibilityId);
                                        const system = data.systems.find(s => s.id === booking.systemId);
                                        const fault = data.faults.find(f => f.id === booking.faultId);
                                        const duration = booking.endTime - booking.startTime;
                                        
                                        return (
                                            <Tooltip key={booking.id}>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className="absolute h-full cursor-pointer hover:opacity-80 transition-opacity"
                                                        style={{
                                                            left: `${left}%`,
                                                            width: `${width}%`,
                                                            backgroundColor: responsibility?.color || 'gray',
                                                        }}
                                                        onClick={() => setSelectedBooking(booking)}
                                                    ></div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p><strong>Duration:</strong> {formatDuration(duration)}</p>
                                                    <p><strong>Responsibility:</strong> {responsibility?.name || 'N/A'}</p>
                                                    <p><strong>System:</strong> {system?.name || 'N/A'}</p>
                                                    <p><strong>Fault:</strong> {fault?.name || 'N/A'}</p>
                                                    <p><strong>Comments:</strong> {booking.comments ? `"${booking.comments}"` : 'None'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                                </div>
                            ))}
                             {area.equipment.length === 0 && (
                                <p className="text-sm text-muted-foreground">No equipment assigned to this area.</p>
                             )}
                        </div>
                    </div>
                ))}
                </div>
            </CardContent>
            </ScrollArea>
        </TooltipProvider>
        <CardFooter>
            <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export as .txt
            </Button>
        </CardFooter>
        </Card>
        
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Downtime Report</CardTitle>
                <CardDescription>Details for the selected event.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
            {selectedBooking && selectedBookingDetails ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg">{selectedBookingDetails.equipment?.name}</h3>
                            <p className="text-sm text-muted-foreground">{formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}</p>
                        </div>
                         <Button variant="ghost" size="icon" onClick={() => setSelectedBooking(null)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-semibold">Duration</p>
                            <p>{formatDuration(selectedBookingDetails.duration)}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Responsibility</p>
                            <p>{selectedBookingDetails.responsibility?.name}</p>
                        </div>
                        <div>
                            <p className="font-semibold">System</p>
                            <p>{selectedBookingDetails.system?.name}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Fault</p>
                            <p>{selectedBookingDetails.fault?.name}</p>
                        </div>
                    </div>

                    <div>
                        <p className="font-semibold text-sm">Comments</p>
                        <p className="text-sm p-2 bg-secondary rounded-md mt-1">{selectedBooking.comments || 'No comments provided.'}</p>
                    </div>

                    <Separator />

                    <div>
                         <p className="font-semibold text-sm">Daily Impact for <span style={{color: selectedBookingDetails.responsibility?.color}}>{selectedBookingDetails.responsibility?.name}</span></p>
                         <p className="text-2xl font-bold mt-1">{formatDuration(selectedBookingDetails.totalForDay)}</p>
                         <p className="text-xs text-muted-foreground">Total downtime for this section today.</p>
                    </div>

                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground p-8">
                    <p>Click a downtime event on the timeline to see its details here.</p>
                </div>
            )}
            </CardContent>
        </Card>
    </div>
  );
}

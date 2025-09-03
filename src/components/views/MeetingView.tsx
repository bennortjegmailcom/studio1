"use client";

import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import type { Booking, Selection, Area } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Download, Trash2, X } from "lucide-react";

const TIME_INCREMENT = 5; // minutes

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const formatDuration = (minutes: number) => {
    const totalMinutes = (minutes + 24*60) % (24*60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m > 0 ? `${m}min` : ''}`;
}

const viewConfig = {
    '24h': { start: 6 * 60, end: 30 * 60, hours: 24, labelEvery: 1 }, // 6am to 6am next day
    'day': { start: 6 * 60, end: 18 * 60, hours: 12, labelEvery: 1 },
    'night': { start: 18 * 60, end: 30 * 60, hours: 12, labelEvery: 1 } // Wraps around midnight
};

function MeetingViewContent() {
  const context = useContext(AppContext)!;
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ visible: boolean; x: number; time: string }>({ visible: false, x: 0, time: '' });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { data, today, trackerVewType, clearBookingsForDay } = context;

  const currentView = viewConfig[trackerVewType];
  const totalMinutes = currentView.end - currentView.start;
  const numColumns = totalMinutes / TIME_INCREMENT;

  const [columnWidth, setColumnWidth] = useState(0);

  const totalEquipmentSlots = useMemo(() => {
    return data.areas.length;
  }, [data.areas]);


  useEffect(() => {
    const calculateColumnWidth = () => {
      if (timelineRef.current) {
        setColumnWidth(timelineRef.current.clientWidth / numColumns);
      }
    };

    calculateColumnWidth();
    const resizeObserver = new ResizeObserver(calculateColumnWidth);
    if(timelineRef.current) resizeObserver.observe(timelineRef.current);

    return () => resizeObserver.disconnect();
  }, [numColumns]);


  const getPositionAndWidth = (booking: Booking) => {
    // Adjust booking times for the next day if they cross midnight
    const date = new Date(booking.date);
    const todayDate = new Date(today);
    const dayDiff = (date.getTime() - todayDate.getTime()) / (1000 * 3600 * 24);

    const bookingStart = booking.startTime + (dayDiff * 24 * 60);
    const bookingEnd = booking.endTime + (dayDiff * 24 * 60);

    let startPos = -1, endPos = -1;

    // Check if the booking overlaps with the current view
    if (bookingStart < currentView.end && bookingEnd > currentView.start) {
        const clampedStart = Math.max(bookingStart, currentView.start);
        const clampedEnd = Math.min(bookingEnd, currentView.end);
        startPos = (clampedStart - currentView.start) / totalMinutes;
        endPos = (clampedEnd - currentView.start) / totalMinutes;
    }

    if(startPos === -1 || endPos === -1 || endPos <= startPos) return null;

    return {
        left: startPos * 100,
        width: (endPos - startPos) * 100,
    };
  }

  const getBookingAreaRow = (booking: Booking) => {
    const area = data.areas.find(a => data.relations.areaToEquipment?.[a.id]?.includes(booking.equipmentId));
    if (!area) return -1;
    return data.areas.indexOf(area);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;

    // Hover Tooltip Logic
    const colIndex = Math.floor(currentX / columnWidth);
    const timeInMinutes = currentView.start + colIndex * TIME_INCREMENT;

    if (timeInMinutes >= currentView.start && timeInMinutes < currentView.end) {
        setHoverTooltip({
            visible: true,
            x: currentX,
            time: formatTime(timeInMinutes % (24*60))
        });
    } else {
        setHoverTooltip(prev => ({...prev, visible: false}));
    }
  };

  const handleMouseLeave = () => {
     setHoverTooltip(prev => ({...prev, visible: false}));
  }

  const handleSelectBooking = (booking: Booking) => {
    setSelectedBooking(booking);
  }

  const dailyTotalsByResponsibility = useMemo(() => {
    const totals: Record<string, number> = {};
    const bookingsToday = data.bookings.filter(b => b.date === today);
    bookingsToday.forEach(booking => {
        const duration = booking.endTime - booking.startTime;
        if (totals[booking.responsibilityId]) {
            totals[booking.responsibilityId] += duration;
        } else {
            totals[booking.responsibilityId] = duration;
        }
    });
    return totals;
  }, [data.bookings, today]);

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

  const bookingsForView = useMemo(() => {
    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(todayDate.getDate() + 1);
    const tomorrowString = tomorrowDate.toISOString().split('T')[0];

    return data.bookings.filter(b => b.date === today || (b.date === tomorrowString));
  }, [data.bookings, today]);

  const bookingsToday = useMemo(() => {
      return data.bookings.filter(b => b.date === today);
  }, [data.bookings, today]);

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
                
                textContent += `Time: ${formatTime(b.startTime)} - ${formatTime(b.endTime)} (${formatDuration(duration)})\n`;
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

  const handleClearAll = () => {
    clearBookingsForDay(today);
    setSelectedBooking(null);
  };

  const timeLabels = useMemo(() => {
    const labels = [];
    const hoursInView = (currentView.end - currentView.start) / 60;
    for (let i = 0; i < hoursInView; i++) {
        if (i % currentView.labelEvery === 0) {
             const hour = (currentView.start / 60 + i) % 24;
             labels.push(`${hour.toString().padStart(2, '0')}:00`);
        }
    }
    return labels;
  }, [currentView]);

  return (
    <div className="grid lg:grid-cols-3 gap-4 h-full">
      <Card className="lg:col-span-2 h-full flex flex-col">
        <CardHeader>
          <CardTitle>Meeting Timeline</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-x-auto pt-8 relative">
            <div className="grid min-h-full" style={{ gridTemplateColumns: '150px 1fr' }}>
              {/* Header: Area Names */}
              <div className="sticky left-0 z-20 font-semibold bg-card border-r border-b">Area</div>
              <div className="relative grid border-b" style={{ gridTemplateColumns: `repeat(${timeLabels.length}, minmax(0, 1fr))` }}>
                {timeLabels.map((label) => (
                  <div key={label} className="text-center p-2 border-r text-sm text-muted-foreground">{label}</div>
                ))}
              </div>
              {/* Body: Timeline Grid */}
              <div className="sticky left-0 z-20 bg-card border-r">
                  {data.areas.map(area => (
                      <div key={area.id} className="font-semibold text-sm border-b flex items-center p-2" style={{ height: `50px` }}>
                          {area.name}
                      </div>
                  ))}
              </div>
              <div
                ref={timelineRef}
                className="relative"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{height: `${totalEquipmentSlots * 50}px`}}
              >
                {/* Hover Tooltip */}
                {hoverTooltip.visible && (
                  <div
                      className="absolute top-0 z-30 flex flex-col items-center pointer-events-none"
                      style={{ transform: `translateX(${hoverTooltip.x}px)`, height: '100%'}}
                  >
                      <div className="bg-foreground text-background text-xs font-mono px-2 py-1 rounded-md -translate-x-1/2 -translate-y-[calc(100%+4px)]">
                          {hoverTooltip.time}
                      </div>
                      <div className="w-px h-full bg-foreground/50"></div>
                  </div>
                )}
                  {/* Render grid and sub-rows */}
                  {data.areas.map((area, areaIndex) => (
                      <div key={area.id} className="relative h-[50px] border-b grid" style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))` }}>
                          {Array.from({ length: numColumns }).map((_, colIndex) => (
                              <div key={colIndex} className={cn("h-full", colIndex % (60 / TIME_INCREMENT) === 0 ? "border-l" : colIndex % (30 / TIME_INCREMENT) === 0 ? "border-l border-dashed" : "")}></div>
                          ))}
                      </div>
                  ))}

                {/* Render Bookings */}
                {bookingsForView.map((booking) => {
                   const rowIndex = getBookingAreaRow(booking);
                   if (rowIndex === -1) return null;

                   const pos = getPositionAndWidth(booking);
                   if (!pos) return null;

                   const responsibility = data.responsibilities.find(r => r.id === booking.responsibilityId);
                   const system = data.systems.find(s => s.id === booking.systemId);
                   const fault = data.faults.find(s => s.id === booking.faultId);
                   const equipment = data.equipment.find(e => e.id === booking.equipmentId);

                   return (
                     <div
                       key={booking.id}
                       data-booking-id={booking.id}
                       onClick={() => handleSelectBooking(booking)}
                       className="absolute h-[42px] rounded-md px-2 py-1 flex flex-col items-start justify-center text-white shadow-lg group cursor-pointer overflow-hidden"
                       style={{
                         top: `${rowIndex * 50 + 4}px`,
                         left: `${pos.left}%`,
                         width: `${pos.width}%`,
                         backgroundColor: responsibility?.color || 'gray',
                       }}
                     >
                       <div className="truncate text-xs font-bold leading-tight">
                         {equipment?.name}
                       </div>
                       <div className="truncate text-xs leading-tight">
                         {system?.name} - {fault?.name}
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export as .txt
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={bookingsToday.length === 0}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All Bookings for Today
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all {bookingsToday.length} bookings for {today}.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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

export default function MeetingView() {
    const context = useContext(AppContext);
    if (!context) return <div>Loading...</div>;
    return <MeetingViewContent />;
}

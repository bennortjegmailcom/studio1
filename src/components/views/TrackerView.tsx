"use client";

import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BookingModal from '@/components/BookingModal';
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
} from "@/components/ui/alert-dialog"

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

function TrackerViewContent() {
  const context = useContext(AppContext)!;
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectionBox, setSelectionBox] = useState<React.CSSProperties>({});
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  const [hoverTooltip, setHoverTooltip] = useState<{ visible: boolean; x: number; time: string }>({ visible: false, x: 0, time: '' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);

  const { data, today, deleteBooking, trackerVewType } = context;

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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-booking-id]')) {
      return;
    }
    if (e.button !== 0 || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPos({ x, y });

    const area = findAreaByY(y);
    if (!area) return;

    const colIndex = Math.floor(x / columnWidth);
    
    const startTime = currentView.start + (colIndex * TIME_INCREMENT);

    const rowIndex = findRowIndexByY(y);
    const topPos = rowIndex * 50;

    setSelection({ areaId: area.id, startTime: startTime % (24*60), endTime: (startTime + TIME_INCREMENT) % (24*60) });
    setSelectionBox({
      position: 'absolute',
      left: colIndex * columnWidth,
      top: topPos,
      width: columnWidth,
      height: 50,
      backgroundColor: 'hsla(var(--primary), 0.3)',
      border: '1px solid hsl(var(--primary))',
      pointerEvents: 'none'
    });
  };

  const findAreaByY = (y: number) => {
    const rowIndex = Math.floor(y / 50);
    return data.areas[rowIndex];
  };

  const findRowIndexByY = (y: number) => {
    return Math.floor(y/50);
  };

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


    // Selection Logic
    if (!isSelecting || !selection) return;

    const startCol = Math.floor(startPos.x / columnWidth);
    const currentCol = Math.max(0, colIndex);

    const left = Math.min(startCol, currentCol) * columnWidth;
    const width = (Math.abs(startCol - currentCol) + 1) * columnWidth;

    setSelectionBox(prev => ({ ...prev, left, width }));
    
    const minCol = Math.min(startCol, currentCol);
    const maxCol = Math.max(startCol, currentCol);

    const newStartTime = currentView.start + minCol * TIME_INCREMENT;
    const newEndTime = currentView.start + (maxCol + 1) * TIME_INCREMENT;

    setSelection(prev => prev ? { ...prev, startTime: newStartTime % (24*60), endTime: newEndTime % (24*60) } : null);
  };

  const handleMouseUp = () => {
    if (isSelecting && selection && selection.endTime !== selection.startTime) {
      setModalOpen(true);
    }
    setIsSelecting(false);
  };

  const handleMouseLeave = () => {
    if (isSelecting) {
        handleMouseUp();
    }
     setHoverTooltip(prev => ({...prev, visible: false}));
  }
  
  const handleEdit = (booking: Booking) => {
    const areaId = data.areas.find(a => data.relations.areaToEquipment?.[a.id]?.includes(booking.equipmentId))?.id;
    const selection = {
        areaId: areaId,
        equipmentId: booking.equipmentId,
        startTime: booking.startTime,
        endTime: booking.endTime
    }
    setSelection(selection);
    setEditingBooking(booking);
    setModalOpen(true);
  }

  const handleDeleteRequest = (bookingId: string) => {
    setBookingToDelete(bookingId);
    setDeleteAlertOpen(true);
  }

  const confirmDelete = () => {
    if(bookingToDelete) {
        deleteBooking(bookingToDelete);
    }
    setDeleteAlertOpen(false);
    setBookingToDelete(null);
    setModalOpen(false);
    setEditingBooking(null);
    setSelection(null);
  }
  
  const bookingsForView = useMemo(() => {
    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(todayDate.getDate() + 1);
    const tomorrowString = tomorrowDate.toISOString().split('T')[0];
    
    return data.bookings.filter(b => b.date === today || (b.date === tomorrowString));
  }, [data.bookings, today]);


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
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Equipment Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-x-auto pt-8 relative">
          
          {/* Selection Info Box */}
          {isSelecting && selection && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 bg-card p-2 rounded-md shadow-lg border text-sm font-mono whitespace-nowrap">
                <span className="text-primary font-semibold">Selection:</span>
                <span className="ml-2">{formatTime(selection.startTime)}</span>
                <span className="mx-2">-</span>
                <span>{formatTime(selection.endTime)}</span>
                <span className="ml-4 font-sans text-muted-foreground">({formatDuration(selection.endTime - selection.startTime)})</span>
            </div>
          )}

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
              className="relative cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{height: `${totalEquipmentSlots * 50}px`}}
            >
              {/* Hover Tooltip */}
              {hoverTooltip.visible && !isSelecting && (
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

              {isSelecting && selectionBox && <div style={selectionBox}></div>}

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
                     onClick={() => handleEdit(booking)}
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
        {modalOpen && (
          <BookingModal
            isOpen={modalOpen}
            onClose={() => {
                setModalOpen(false);
                setSelection(null);
                setEditingBooking(null);
            }}
            selection={selection}
            booking={editingBooking}
            onDelete={handleDeleteRequest}
          />
        )}
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the booking.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function TrackerView() {
    const context = useContext(AppContext);
    if (!context) return <div>Loading...</div>;
    return <TrackerViewContent />;
}

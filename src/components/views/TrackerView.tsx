
"use client";

import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BookingModal from '@/components/BookingModal';
import type { Booking, Selection } from '@/lib/types';
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m > 0 ? `${m}min` : ''}`;
}

const viewConfig = {
    '24h': { start: 0, end: 24 * 60, hours: 24, labelEvery: 1 },
    'day': { start: 6 * 60, end: 18 * 60, hours: 12, labelEvery: 1 },
    'night': { start: 18 * 60, end: 6 * 60, hours: 12, labelEvery: 1 }
};

export default function TrackerView() {
  const context = useContext(AppContext);
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

  if (!context) return <div>Loading...</div>;
  const { data, today, deleteBooking, trackerVewType } = context;

  const currentView = viewConfig[trackerVewType];
  const totalMinutes = trackerVewType === 'night' ? 12 * 60 : currentView.end - currentView.start;
  const numColumns = totalMinutes / TIME_INCREMENT;

  const [columnWidth, setColumnWidth] = useState(0);

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
    const bookingStart = booking.startTime;
    const bookingEnd = booking.endTime;

    let startPos = -1, endPos = -1;

    if (trackerVewType === 'night') {
        const nightDuration = 12 * 60;
        let effectiveStart = -1;
        if(bookingStart >= 18*60) effectiveStart = bookingStart - 18*60;
        else if(bookingStart < 6*60) effectiveStart = bookingStart + 6*60;
        
        let effectiveEnd = -1;
        if(bookingEnd > 18*60) effectiveEnd = bookingEnd - 18*60;
        else if(bookingEnd <= 6*60) effectiveEnd = bookingEnd + 6*60;
        else if (bookingEnd > 6*60 && bookingStart >= 18*60) effectiveEnd = nightDuration;


        if(effectiveStart !== -1 && effectiveEnd !== -1 && effectiveEnd > effectiveStart){
            startPos = effectiveStart / nightDuration;
            endPos = effectiveEnd / nightDuration;
        }

    } else {
       if (bookingStart < currentView.end && bookingEnd > currentView.start) {
           const clampedStart = Math.max(bookingStart, currentView.start);
           const clampedEnd = Math.min(bookingEnd, currentView.end);
           startPos = (clampedStart - currentView.start) / totalMinutes;
           endPos = (clampedEnd - currentView.start) / totalMinutes;
       }
    }

    if(startPos === -1 || endPos === -1 || endPos < startPos) return null;

    return {
        left: startPos * 100,
        width: (endPos - startPos) * 100,
    };
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPos({ x, y });

    const rowIndex = Math.floor(y / 50); // 50px row height
    const equipment = data.equipment[rowIndex];
    if (!equipment) return;

    const colIndex = Math.floor(x / columnWidth);
    
    let startTime;
    if (trackerVewType === 'night') {
        const minutesIntoShift = colIndex * TIME_INCREMENT;
        startTime = (18 * 60 + minutesIntoShift) % (24 * 60);
    } else {
        startTime = currentView.start + (colIndex * TIME_INCREMENT);
    }

    setSelection({ equipmentId: equipment.id, startTime, endTime: startTime + TIME_INCREMENT });
    setSelectionBox({
      position: 'absolute',
      left: colIndex * columnWidth,
      top: rowIndex * 50,
      width: columnWidth,
      height: 50,
      backgroundColor: 'hsla(var(--primary), 0.3)',
      border: '1px solid hsl(var(--primary))',
      pointerEvents: 'none'
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;

    // Hover Tooltip Logic
    const colIndex = Math.floor(currentX / columnWidth);
    
    let timeInMinutes;
     if (trackerVewType === 'night') {
        const minutesIntoShift = colIndex * TIME_INCREMENT;
        timeInMinutes = (18 * 60 + minutesIntoShift) % (24 * 60);
    } else {
        timeInMinutes = currentView.start + colIndex * TIME_INCREMENT;
    }

    if (timeInMinutes >= 0 && timeInMinutes < 24 * 60) {
        setHoverTooltip({
            visible: true,
            x: currentX,
            time: formatTime(timeInMinutes)
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

    let newStartTime, newEndTime;

    if (trackerVewType === 'night') {
        const startMinutesIntoShift = minCol * TIME_INCREMENT;
        newStartTime = (18 * 60 + startMinutesIntoShift) % (24 * 60);
        const endMinutesIntoShift = (maxCol + 1) * TIME_INCREMENT;
        newEndTime = (18 * 60 + endMinutesIntoShift) % (24 * 60);
    } else {
        newStartTime = currentView.start + minCol * TIME_INCREMENT;
        newEndTime = currentView.start + (maxCol + 1) * TIME_INCREMENT;
    }


    setSelection(prev => prev ? { ...prev, startTime: newStartTime, endTime: newEndTime } : null);
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
    const selection = {
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
  }

  const bookingsToday = data.bookings.filter(b => b.date === today);

  const timeLabels = useMemo(() => {
    const labels = [];
    if(trackerVewType === 'night') {
        for (let i = 0; i < 6; i++) labels.push(`${18 + i}:00`);
        labels.push("00:00");
        for (let i = 1; i < 6; i++) labels.push(`0${i}:00`);
    } else {
        for (let i = 0; i < currentView.hours; i++) {
            if (i % currentView.labelEvery === 0) {
                 labels.push(`${(currentView.start / 60 + i).toString().padStart(2, '0')}:00`);
            }
        }
    }
    return labels;
  }, [trackerVewType, currentView]);

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
            {/* Header: Equipment Names */}
            <div className="sticky left-0 z-20 font-semibold bg-card border-r border-b">Equipment</div>
            <div className="relative grid border-b" style={{ gridTemplateColumns: `repeat(${timeLabels.length}, minmax(0, 1fr))` }}>
              {timeLabels.map((label) => (
                <div key={label} className="text-center p-2 border-r text-sm text-muted-foreground">{label}</div>
              ))}
            </div>
            {/* Body: Timeline Grid */}
            <div className="sticky left-0 z-20 bg-card border-r">
              {data.equipment.map(eq => (
                <div key={eq.id} className="flex items-center h-[50px] p-2 border-b whitespace-nowrap">
                  {eq.name}
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
            >
              {/* Hover Tooltip */}
              {hoverTooltip.visible && !isSelecting && (
                <div 
                    className="absolute top-0 z-30 flex flex-col items-center pointer-events-none"
                    style={{ transform: `translateX(${hoverTooltip.x}px)`}}
                >
                    <div className="bg-foreground text-background text-xs font-mono px-2 py-1 rounded-md -translate-x-1/2 -translate-y-[calc(100%+4px)]">
                        {hoverTooltip.time}
                    </div>
                    <div className="w-px h-full bg-foreground/50 -translate-y-full"></div>
                </div>
              )}

              {data.equipment.map((eq, rowIndex) => (
                <div key={eq.id} className="relative h-[50px] border-b grid" style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))` }}>
                  {Array.from({ length: numColumns }).map((_, colIndex) => (
                     <div key={colIndex} className={cn("h-full", colIndex % (60 / TIME_INCREMENT) === 0 ? "border-l" : colIndex % (30 / TIME_INCREMENT) === 0 ? "border-l border-dashed" : "")}></div>
                  ))}
                </div>
              ))}

              {isSelecting && selectionBox && <div style={selectionBox}></div>}

              {/* Render Bookings */}
              {bookingsToday.map((booking) => {
                 const rowIndex = data.equipment.findIndex(e => e.id === booking.equipmentId);
                 if (rowIndex === -1) return null;
                 
                 const pos = getPositionAndWidth(booking);
                 if (!pos) return null;

                 const responsibility = data.responsibilities.find(r => r.id === booking.responsibilityId);
                 const system = data.systems.find(s => s.id === booking.systemId);
                 const fault = data.faults.find(s => s.id === booking.faultId);

                 return (
                   <div
                     key={booking.id}
                     className="absolute h-[42px] rounded-md px-2 py-1 flex items-center justify-between text-white shadow-lg group"
                     style={{
                       top: `${rowIndex * 50 + 4}px`,
                       left: `${pos.left}%`,
                       width: `${pos.width}%`,
                       backgroundColor: responsibility?.color || 'gray',
                       minWidth: '100px',
                     }}
                   >
                     <div className="truncate text-sm">
                       <strong>{system?.name}</strong> - {fault?.name}
                     </div>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-black/20 hover:bg-black/40 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(booking)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteRequest(booking.id)} className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                     </DropdownMenu>
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
            selection={editingBooking ? {equipmentId: editingBooking.equipmentId, startTime: editingBooking.startTime, endTime: editingBooking.endTime} : selection}
            booking={editingBooking}
          />
        )}
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the booking.
                </Description>
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


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
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m > 0 ? `${m}min` : ''}`;
}

const viewConfig = {
    '24h': { start: 6 * 60, end: 30 * 60, hours: 24, labelEvery: 1 }, // 6am to 6am next day
    'day': { start: 6 * 60, end: 18 * 60, hours: 12, labelEvery: 1 },
    'night': { start: 18 * 60, end: 6 * 60, hours: 12, labelEvery: 1 } // Wraps around midnight
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
  
  const areasWithEquipment = useMemo(() => {
    return data.areas.map(area => ({
        ...area,
        equipment: data.relations.areaToEquipment?.[area.id]?.map(eqId => 
            data.equipment.find(eq => eq.id === eqId)
        ).filter((eq): eq is NonNullable<typeof eq> => eq != null) || []
    }));
  }, [data.areas, data.equipment, data.relations.areaToEquipment]);

  const totalEquipmentSlots = useMemo(() => {
    return areasWithEquipment.reduce((acc, area) => acc + Math.max(1, area.equipment.length), 0);
  }, [areasWithEquipment]);


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
    // Adjust booking times for the next day if they cross midnight and the view is 24h
    const date = new Date(booking.date);
    const todayDate = new Date(today);
    const dayDiff = (date.getTime() - todayDate.getTime()) / (1000 * 3600 * 24);

    const bookingStart = booking.startTime + (dayDiff * 24 * 60);
    const bookingEnd = booking.endTime + (dayDiff * 24 * 60);

    let startPos = -1, endPos = -1;

    if (trackerVewType === 'night') {
        const nightDuration = 12 * 60;
        let effectiveStart = -1;
        if(booking.startTime >= 18*60) effectiveStart = booking.startTime - 18*60;
        else if(booking.startTime < 6*60) effectiveStart = booking.startTime + 6*60;
        
        let effectiveEnd = -1;
        if(booking.endTime > 18*60) effectiveEnd = booking.endTime - 18*60;
        else if(booking.endTime <= 6*60) effectiveEnd = booking.endTime + 6*60;
        else if (booking.endTime > 6*60 && booking.startTime >= 18*60) effectiveEnd = nightDuration;


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
    if ((e.target as HTMLElement).closest('[data-booking-id]')) {
      return;
    }
    if (e.button !== 0 || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPos({ x, y });

    const { equipment } = findEquipmentByY(y);
    if (!equipment) return;

    const colIndex = Math.floor(x / columnWidth);
    
    let startTime;
    if (trackerVewType === 'night') {
        const minutesIntoShift = colIndex * TIME_INCREMENT;
        startTime = (18 * 60 + minutesIntoShift) % (24 * 60);
    } else {
        startTime = currentView.start + (colIndex * TIME_INCREMENT);
    }

    const { rowIndex, subRowIndex } = findRowIndicesByY(y);
    const topPos = (rowIndex + subRowIndex) * 50;

    setSelection({ equipmentId: equipment.id, startTime: startTime % (24*60), endTime: (startTime + TIME_INCREMENT) % (24 * 60) });
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

  const findEquipmentByY = (y: number) => {
    let cumulativeHeight = 0;
    let cumulativeRowIndex = 0;
    for (const area of areasWithEquipment) {
        const areaEquipmentCount = Math.max(1, area.equipment.length);
        const areaHeight = areaEquipmentCount * 50;
        if (y >= cumulativeHeight && y < cumulativeHeight + areaHeight) {
            const subRowIndex = Math.floor((y - cumulativeHeight) / 50);
            return { equipment: area.equipment[subRowIndex], area, rowIndex: cumulativeRowIndex, subRowIndex };
        }
        cumulativeHeight += areaHeight;
        cumulativeRowIndex += areaEquipmentCount;
    }
    return { equipment: null, area: null, rowIndex: -1, subRowIndex: -1 };
};

const findRowIndicesByY = (y: number) => {
    let rowIndex = 0;
    let subRowIndex = 0;
    let cumulativeHeight = 0;
    for (const area of areasWithEquipment) {
        const areaEquipmentCount = Math.max(1, area.equipment.length);
        const areaHeight = areaEquipmentCount * 50;
        if (y >= cumulativeHeight && y < cumulativeHeight + areaHeight) {
            rowIndex = Array.from({length: data.areas.indexOf(area)}).reduce((acc, _, i) => acc + Math.max(1, areasWithEquipment[i].equipment.length), 0);
            subRowIndex = Math.floor((y - cumulativeHeight) / 50);
            break;
        }
        cumulativeHeight += areaHeight;
    }
    return { rowIndex, subRowIndex };
};

const getBookingRowAndSubRow = (booking: Booking) => {
    let rowIndex = 0;
    for (const area of areasWithEquipment) {
        const areaEquipmentCount = area.equipment.length;
        const subRowIndex = area.equipment.findIndex(e => e.id === booking.equipmentId);
        if (subRowIndex !== -1) {
            return { rowIndex, subRowIndex };
        }
        rowIndex += Math.max(1, areaEquipmentCount);
    }
    return { rowIndex: -1, subRowIndex: -1 };
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
        timeInMinutes = (18 * 60 + minutesIntoShift);
    } else {
        timeInMinutes = currentView.start + colIndex * TIME_INCREMENT;
    }

    if (timeInMinutes >= 0) {
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
    setModalOpen(false); // Close the edit modal if it's open
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
  
  const bookingsForView = useMemo(() => {
    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(todayDate.getDate() + 1);
    const tomorrowString = tomorrowDate.toISOString().split('T')[0];
    
    return data.bookings.filter(b => b.date === today || (trackerVewType === '24h' && b.date === tomorrowString) || (trackerVewType === 'night' && b.date === tomorrowString));
  }, [data.bookings, today, trackerVewType]);


  const timeLabels = useMemo(() => {
    const labels = [];
    if(trackerVewType === 'night') {
        for (let i = 0; i < 6; i++) labels.push(`${18 + i}:00`);
        labels.push("00:00");
        for (let i = 1; i < 6; i++) labels.push(`0${i}:00`);
    } else {
        for (let i = 0; i < currentView.hours; i++) {
            if (i % currentView.labelEvery === 0) {
                 const hour = (currentView.start / 60 + i) % 24;
                 labels.push(`${hour.toString().padStart(2, '0')}:00`);
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
                <span className="ml-4 font-sans text-muted-foreground">({formatDuration((selection.endTime - selection.startTime + 24*60) % (24*60) )})</span>
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
                {areasWithEquipment.map(area => (
                    <div key={area.id} className="font-semibold text-sm border-b" style={{ height: `${Math.max(1, area.equipment.length) * 50}px` }}>
                        <div className="p-2 sticky top-0">{area.name}</div>
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
                {(() => {
                    let cumulativeHeight = 0;
                    return areasWithEquipment.map(area => {
                        const areaEquipmentCount = Math.max(1, area.equipment.length);
                        const currentAreaHeight = cumulativeHeight;
                        cumulativeHeight += areaEquipmentCount * 50;

                        return (
                            <div key={area.id} className="absolute w-full" style={{ top: `${currentAreaHeight}px`, height: `${areaEquipmentCount * 50}px`}}>
                                {area.equipment.map((eq, subIndex) => (
                                    <div key={eq.id} className="relative h-[50px] border-b grid" style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))` }}>
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{eq.name}</div>
                                        {Array.from({ length: numColumns }).map((_, colIndex) => (
                                            <div key={colIndex} className={cn("h-full", colIndex % (60 / TIME_INCREMENT) === 0 ? "border-l" : colIndex % (30 / TIME_INCREMENT) === 0 ? "border-l border-dashed" : "")}></div>
                                        ))}
                                    </div>
                                ))}
                                {area.equipment.length === 0 && (
                                     <div className="relative h-[50px] border-b grid" style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))` }}>
                                         {Array.from({ length: numColumns }).map((_, colIndex) => (
                                            <div key={colIndex} className={cn("h-full", colIndex % (60 / TIME_INCREMENT) === 0 ? "border-l" : colIndex % (30 / TIME_INCREMENT) === 0 ? "border-l border-dashed" : "")}></div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    });
                })()}

              {isSelecting && selectionBox && <div style={selectionBox}></div>}

              {/* Render Bookings */}
              {bookingsForView.map((booking) => {
                 const {rowIndex, subRowIndex} = getBookingRowAndSubRow(booking);
                 if (rowIndex === -1) return null;
                 
                 const pos = getPositionAndWidth(booking);
                 if (!pos) return null;

                 const responsibility = data.responsibilities.find(r => r.id === booking.responsibilityId);
                 const system = data.systems.find(s => s.id === booking.systemId);
                 const fault = data.faults.find(s => s.id === booking.faultId);

                 return (
                   <div
                     key={booking.id}
                     data-booking-id={booking.id}
                     onClick={() => handleEdit(booking)}
                     className="absolute h-[42px] rounded-md px-2 py-1 flex items-center justify-between text-white shadow-lg group cursor-pointer"
                     style={{
                       top: `${(rowIndex + subRowIndex) * 50 + 4}px`,
                       left: `${pos.left}%`,
                       width: `${pos.width}%`,
                       backgroundColor: responsibility?.color || 'gray',
                       minWidth: '100px',
                     }}
                   >
                     <div className="truncate text-sm">
                       <strong>{system?.name}</strong> - {fault?.name}
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
            selection={editingBooking ? {equipmentId: editingBooking.equipmentId, startTime: editingBooking.startTime, endTime: editingBooking.endTime} : selection}
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

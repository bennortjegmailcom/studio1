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
const TOTAL_MINUTES = 24 * 60;
const NUM_COLUMNS = TOTAL_MINUTES / TIME_INCREMENT;

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export default function TrackerView() {
  const context = useContext(AppContext);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectionBox, setSelectionBox] = useState<React.CSSProperties>({});
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);

  const columnWidth = useMemo(() => {
    if (timelineRef.current) {
      return timelineRef.current.scrollWidth / NUM_COLUMNS;
    }
    return 4; // default width
  }, [timelineRef.current?.scrollWidth]);
  
  useEffect(() => {
    const handleResize = () => {
      // force re-render to recalculate column width
      setSelection(null);
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])


  if (!context) return <div>Loading...</div>;
  const { data, today, deleteBooking } = context;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const rect = timelineRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPos({ x, y });

    const rowIndex = Math.floor(y / 50); // 50px row height
    const equipment = data.equipment[rowIndex];
    if (!equipment) return;

    const colIndex = Math.floor(x / columnWidth);
    const startTime = colIndex * TIME_INCREMENT;

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
    if (!isSelecting || !selection) return;

    const rect = timelineRef.current!.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    
    const startCol = Math.floor(startPos.x / columnWidth);
    const currentCol = Math.max(0, Math.floor(currentX / columnWidth));

    const left = Math.min(startCol, currentCol) * columnWidth;
    const width = (Math.abs(startCol - currentCol) + 1) * columnWidth;

    setSelectionBox(prev => ({ ...prev, left, width }));
    
    const newStartTime = Math.min(startCol, currentCol) * TIME_INCREMENT;
    const newEndTime = (Math.max(startCol, currentCol) + 1) * TIME_INCREMENT;

    setSelection(prev => prev ? { ...prev, startTime: newStartTime, endTime: newEndTime } : null);
  };

  const handleMouseUp = () => {
    if (isSelecting && selection && selection.endTime > selection.startTime) {
      setModalOpen(true);
    }
    setIsSelecting(false);
  };
  
  const handleEdit = (booking: Booking) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Timeline</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="relative" style={{ minWidth: '1200px' }}>
          <div className="grid" style={{ gridTemplateColumns: '150px 1fr' }}>
            {/* Header: Equipment Names */}
            <div className="sticky left-0 z-20 font-semibold bg-card border-r border-b">Equipment</div>
            <div className="relative grid border-b" style={{ gridTemplateColumns: `repeat(${24}, minmax(0, 1fr))` }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="text-center p-2 border-r text-sm text-muted-foreground">{`${i.toString().padStart(2, '0')}:00`}</div>
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
              onMouseLeave={() => isSelecting && handleMouseUp()}
            >
              {data.equipment.map((eq, rowIndex) => (
                <div key={eq.id} className="relative h-[50px] border-b grid" style={{ gridTemplateColumns: `repeat(${NUM_COLUMNS}, minmax(0, 1fr))` }}>
                  {Array.from({ length: NUM_COLUMNS }).map((_, colIndex) => (
                     <div key={colIndex} className={cn("h-full", colIndex % 12 === 0 ? "border-l" : colIndex % 6 === 0 ? "border-l border-dashed" : "")}></div>
                  ))}
                </div>
              ))}

              {isSelecting && selectionBox && <div style={selectionBox}></div>}

              {/* Render Bookings */}
              {bookingsToday.map((booking) => {
                 const rowIndex = data.equipment.findIndex(e => e.id === booking.equipmentId);
                 if (rowIndex === -1) return null;

                 const left = (booking.startTime / TOTAL_MINUTES) * 100;
                 const width = ((booking.endTime - booking.startTime) / TOTAL_MINUTES) * 100;
                 const section = data.sections.find(s => s.id === booking.sectionId);
                 const system = data.systems.find(s => s.id === booking.systemId);
                 const fault = data.faults.find(s => s.id === booking.faultId);

                 return (
                   <div
                     key={booking.id}
                     className="absolute h-[42px] rounded-md px-2 py-1 flex items-center justify-between text-white shadow-lg group"
                     style={{
                       top: `${rowIndex * 50 + 4}px`,
                       left: `${left}%`,
                       width: `${width}%`,
                       backgroundColor: section?.color || 'gray',
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

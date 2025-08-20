"use client";

import React, { useState, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { initialData } from '@/data/initialData';
import type { AppData, Booking, Selection } from '@/lib/types';
import { AppContext } from '@/contexts/AppContext';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import TrackerView from '@/components/views/TrackerView';
import MeetingView from '@/components/views/MeetingView';
import AutoBookerView from '@/components/views/AutoBookerView';
import AdminView from '@/components/views/AdminView';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, GanttChartSquare, Users, Bot, Settings, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays } from 'date-fns';

type View = 'tracker' | 'meeting' | 'autobooker' | 'admin';

function AppHeader({ activeView, onSelectView }: { activeView: View; onSelectView: (view: View) => void }) {
  const { today, setToday } = React.useContext(AppContext)!;

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setToday(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-xl font-semibold">EquipTrack AI</h1>
      </div>
      <div className="flex items-center gap-2">
        {activeView === 'tracker' || activeView === 'meeting' ? (
          <>
            <Button variant="outline" size="icon" onClick={() => setToday(format(subDays(new Date(today), 1), 'yyyy-MM-dd'))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(new Date(today), 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={new Date(today)}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={() => setToday(format(addDays(new Date(today), 1), 'yyyy-MM-dd'))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setToday(format(new Date(), 'yyyy-MM-dd'))}>Today</Button>
          </>
        ) : <div className="w-[360px]"></div>}
      </div>
      <div></div>
    </header>
  );
}

export default function ClientPage() {
  const [data, setData] = useLocalStorage<AppData>('equip-track-ai-data', initialData);
  const [activeView, setActiveView] = useState<View>('tracker');
  const [today, setToday] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const addBooking = useCallback((bookingData: Omit<Booking, 'id' | 'date'>, selection: Selection) => {
    setData(prevData => {
      const newBooking: Booking = {
        ...bookingData,
        id: `booking-${Date.now()}`,
        date: today,
        startTime: selection.startTime,
        endTime: selection.endTime,
      };
      return { ...prevData, bookings: [...prevData.bookings, newBooking] };
    });
  }, [setData, today]);

  const updateBooking = useCallback((updatedBooking: Booking) => {
    setData(prevData => ({
      ...prevData,
      bookings: prevData.bookings.map(b => b.id === updatedBooking.id ? updatedBooking : b),
    }));
  }, [setData]);
  
  const deleteBooking = useCallback((bookingId: string) => {
    setData(prevData => ({
      ...prevData,
      bookings: prevData.bookings.filter(b => b.id !== bookingId),
    }));
  }, [setData]);


  const appContextValue = {
    data,
    setData,
    addBooking,
    updateBooking,
    deleteBooking,
    today,
    setToday,
  };

  const renderView = () => {
    switch (activeView) {
      case 'tracker':
        return <TrackerView />;
      case 'meeting':
        return <MeetingView />;
      case 'autobooker':
        return <AutoBookerView />;
      case 'admin':
        return <AdminView />;
      default:
        return <TrackerView />;
    }
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="flex h-screen w-full bg-background">
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2 p-2">
                <GanttChartSquare className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-semibold grow">EquipTrack AI</h2>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setActiveView('tracker')} isActive={activeView === 'tracker'} tooltip="Tracker View">
                    <GanttChartSquare />
                    Tracker
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setActiveView('meeting')} isActive={activeView === 'meeting'} tooltip="Meeting View">
                    <Users />
                    Meeting View
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setActiveView('autobooker')} isActive={activeView === 'autobooker'} tooltip="Auto Booker">
                    <Bot />
                    AI Auto Booker
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setActiveView('admin')} isActive={activeView === 'admin'} tooltip="Admin Panel">
                    <Settings />
                    Admin
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <div className="flex flex-col flex-1 w-full min-w-0">
             <AppHeader activeView={activeView} onSelectView={setActiveView} />
            <main className="flex-1 overflow-auto p-4">
              {renderView()}
            </main>
          </div>
        </SidebarProvider>
      </div>
    </AppContext.Provider>
  );
}

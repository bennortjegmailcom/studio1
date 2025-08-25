
"use client";

import React from 'react';
import useFirestoreData from '@/hooks/useFirestoreData';
import type { Booking, Selection } from '@/lib/types';
import { AppContext } from '@/contexts/AppContext';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import TrackerView from '@/components/views/TrackerView';
import MeetingView from '@/components/views/MeetingView';
import AutoBookerView from '@/components/views/AutoBookerView';
import AdminView from '@/components/views/AdminView';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, GanttChartSquare, Users, Bot, Settings, ChevronLeft, ChevronRight, Menu, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type View = 'tracker' | 'meeting' | 'autobooker' | 'admin';
export type TrackerViewType = '24h' | 'day' | 'night';

function AppHeader({ activeView }: { activeView: View }) {
  const { today, setToday } = React.useContext(AppContext)!;
  const { trackerVewType, setTrackerViewType } = React.useContext(AppContext)!;

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
      <div className="w-[240px] flex justify-end">
        {activeView === 'tracker' && (
           <Tabs value={trackerVewType} onValueChange={(value) => setTrackerViewType(value as TrackerViewType)}>
            <TabsList>
                <TabsTrigger value="24h">24h</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="night">Night</TabsTrigger>
            </TabsList>
           </Tabs>
        )}
      </div>
    </header>
  );
}

export default function ClientPage() {
  const { 
    data, 
    setData, 
    loading,
    addBooking,
    updateBooking,
    deleteBooking,
    clearBookingsForDay,
  } = useFirestoreData();
  
  const [activeView, setActiveView] = React.useState<View>('tracker');
  const [today, setToday] = React.useState<string>(() => new Date().toISOString().split('T')[0]);
  const [trackerVewType, setTrackerViewType] = React.useState<TrackerViewType>('24h');

  const addBookingCallback = React.useCallback((bookingData: Omit<Booking, 'id' | 'date'>, selection: Selection) => {
    const newBooking: Omit<Booking, 'id'> = {
        ...bookingData,
        date: today,
        startTime: selection.startTime,
        endTime: selection.endTime,
      };
    addBooking(newBooking);
  }, [addBooking, today]);


  const appContextValue = {
    data,
    setData,
    addBooking: addBookingCallback,
    updateBooking,
    deleteBooking,
    clearBookingsForDay,
    today,
    setToday,
    trackerVewType,
    setTrackerViewType,
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
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Connecting to database...</p>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="flex h-screen w-full bg-background">
        <SidebarProvider>
          <Sidebar collapsible="icon">
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
             <AppHeader activeView={activeView} />
            <main className="flex-1 overflow-auto p-4">
              {renderView()}
            </main>
          </div>
        </SidebarProvider>
      </div>
    </AppContext.Provider>
  );
}

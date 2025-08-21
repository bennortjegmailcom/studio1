import type { AppData, Booking, Selection } from '@/lib/types';
import type { TrackerViewType } from '@/app/client-page';
import type { Dispatch, SetStateAction } from 'react';
import { createContext } from 'react';

interface AppContextType {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  addBooking: (booking: Omit<Booking, 'id' | 'date' | 'startTime' | 'endTime'>, selection: Selection) => void;
  updateBooking: (booking: Booking) => void;
  deleteBooking: (bookingId: string) => void;
  today: string;
  setToday: Dispatch<SetStateAction<string>>;
  trackerVewType: TrackerViewType;
  setTrackerViewType: Dispatch<SetStateAction<TrackerViewType>>;
}

export const AppContext = createContext<AppContextType | null>(null);

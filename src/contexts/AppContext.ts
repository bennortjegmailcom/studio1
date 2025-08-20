import type { AppData, Booking, Selection } from '@/lib/types';
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
}

export const AppContext = createContext<AppContextType | null>(null);

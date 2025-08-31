
"use client";

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import type { AppData, Booking } from '@/lib/types';
import { initialData } from '@/data/initialData';
import { useToast } from './use-toast';

const DATA_DOC_ID = 'appData'; // Using a single document for simplicity

export default function useFirestoreData() {
  const [data, setData] = useState<AppData>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const docRef = doc(db, 'data', DATA_DOC_ID);

    const unsubscribe = onSnapshot(docRef, 
        (docSnap) => {
            if (docSnap.exists()) {
                setData(docSnap.data() as AppData);
                setError(null);
            } else {
                // Document doesn't exist, so initialize it
                console.log('No such document! Initializing with default data.');
                setDoc(docRef, initialData)
                    .then(() => {
                        setData(initialData);
                        setError(null);
                    })
                    .catch(error => {
                        console.error("Error initializing document:", error);
                        toast({ variant: 'destructive', title: 'Database Error', description: 'Could not initialize data.' });
                        setError(error);
                    });
            }
            setLoading(false);
        }, 
        (error) => {
            console.error("Error listening to document:", error);
            toast({ variant: 'destructive', title: 'Connection Error', description: 'Could not connect to the database.' });
            setError(error);
            setLoading(false);
        }
    );

    return () => unsubscribe();
  }, [toast]);

  const updateRemoteState = useCallback(async (updatedData: AppData) => {
    try {
        const docRef = doc(db, 'data', DATA_DOC_ID);
        await setDoc(docRef, updatedData);
        setError(null);
    } catch (error) {
        console.error("Error updating document:", error);
        toast({ variant: 'destructive', title: 'Sync Error', description: 'Could not save changes to the database.' });
        setError(error as Error);
    }
  }, [toast]);


  const addBooking = useCallback(async (newBookingData: Omit<Booking, 'id'>) => {
    const newBooking: Booking = {
        ...newBookingData,
        id: `booking-${Date.now()}`,
    };
    try {
        const docRef = doc(db, 'data', DATA_DOC_ID);
        await updateDoc(docRef, {
            bookings: arrayUnion(newBooking)
        });
    } catch(error) {
        console.error("Error adding booking:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add the new booking.' });
    }
  }, [toast]);

  const updateBooking = useCallback(async (updatedBooking: Booking) => {
    try {
        const docRef = doc(db, 'data', DATA_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const currentData = docSnap.data() as AppData;
            const updatedBookings = currentData.bookings.map(b => b.id === updatedBooking.id ? updatedBooking : b);
            await updateDoc(docRef, { bookings: updatedBookings });
        }
    } catch(error) {
        console.error("Error updating booking:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update the booking.' });
    }
  }, [toast]);

  const deleteBooking = useCallback(async (bookingId: string) => {
    try {
        const docRef = doc(db, 'data', DATA_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const currentData = docSnap.data() as AppData;
            const bookingToDelete = currentData.bookings.find(b => b.id === bookingId);
            if (bookingToDelete) {
                await updateDoc(docRef, {
                    bookings: arrayRemove(bookingToDelete)
                });
            }
        }
    } catch(error) {
        console.error("Error deleting booking:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the booking.' });
    }
  }, [toast]);

  const clearBookingsForDay = useCallback(async (date: string) => {
    try {
        const docRef = doc(db, 'data', DATA_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const currentData = docSnap.data() as AppData;
            const bookingsToKeep = currentData.bookings.filter(b => b.date !== date);
            await updateDoc(docRef, { bookings: bookingsToKeep });
            toast({ title: 'Success', description: `All bookings for ${date} have been cleared.` });
        }
    } catch(error) {
        console.error("Error clearing bookings:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not clear bookings for the selected day.' });
    }
  }, [toast]);


  return { data, setData: updateRemoteState, loading, error, addBooking, updateBooking, deleteBooking, clearBookingsForDay };
}

"use client";

import React, { useContext, useEffect, useMemo } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Booking, Selection } from '@/lib/types';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";


const bookingSchema = z.object({
  systemId: z.string().min(1, 'System is required.'),
  sectionId: z.string().min(1, 'Section is required.'),
  faultId: z.string().min(1, 'Fault is required.'),
  comments: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selection: Selection | null;
  booking?: Booking | null;
}

export default function BookingModal({ isOpen, onClose, selection, booking }: BookingModalProps) {
  const context = useContext(AppContext);
  if (!context) return null;

  const { data, addBooking, updateBooking } = context;

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      systemId: '',
      sectionId: '',
      faultId: '',
      comments: '',
    },
  });

  const { watch, reset, setValue } = form;
  const selectedSystemId = watch('systemId');

  useEffect(() => {
    if (booking) {
      reset({
        systemId: booking.systemId,
        sectionId: booking.sectionId,
        faultId: booking.faultId,
        comments: booking.comments,
      });
    } else {
      reset({ systemId: '', sectionId: '', faultId: '', comments: '' });
    }
  }, [booking, isOpen, reset]);

  const equipment = useMemo(() => 
    selection ? data.equipment.find(e => e.id === selection.equipmentId) : null,
    [selection, data.equipment]
  );
  
  const availableSystems = useMemo(() => {
    if (!equipment) return [];
    const systemIds = data.relations.equipmentToSystem[equipment.id] || [];
    return data.systems.filter(s => systemIds.includes(s.id));
  }, [equipment, data.relations, data.systems]);
  
  const availableSections = useMemo(() => {
    if (!selectedSystemId) return [];
    const sectionIds = data.relations.systemToDetails[selectedSystemId]?.sections || [];
    return data.sections.filter(s => sectionIds.includes(s.id));
  }, [selectedSystemId, data.relations, data.sections]);
  
  const availableFaults = useMemo(() => {
    if (!selectedSystemId) return [];
    const faultIds = data.relations.systemToDetails[selectedSystemId]?.faults || [];
    return data.faults.filter(f => faultIds.includes(f.id));
  }, [selectedSystemId, data.relations, data.faults]);


  // Effect to reset section/fault if system changes and they are no longer valid
  useEffect(() => {
    if (!availableSections.some(s => s.id === watch('sectionId'))) {
        setValue('sectionId', '');
    }
     if (!availableFaults.some(f => f.id === watch('faultId'))) {
        setValue('faultId', '');
    }
  }, [selectedSystemId, availableSections, availableFaults, watch, setValue]);

  const onSubmit = (formData: BookingFormData) => {
    if (booking) {
      updateBooking({ ...booking, ...formData });
    } else if (selection) {
      addBooking({ ...formData, equipmentId: selection.equipmentId }, selection);
    }
    onClose();
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  if (!selection) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{booking ? 'Edit' : 'Create'} Booking</DialogTitle>
          <DialogDescription>
            For {equipment?.name} from {formatTime(selection.startTime)} to {formatTime(selection.endTime)}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="systemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a system" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSystems.map(system => (
                        <SelectItem key={system.id} value={system.id}>
                          {system.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSystemId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a section" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSections.map(section => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="faultId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fault</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSystemId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a fault" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableFaults.map(fault => (
                        <SelectItem key={fault.id} value={fault.id}>
                          {fault.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any comments..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save Booking</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

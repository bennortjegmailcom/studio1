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
import { Input } from './ui/input';


const bookingSchema = z.object({
  areaId: z.string().min(1, 'Area is required.'),
  equipmentId: z.string().min(1, 'Equipment is required.'),
  systemId: z.string().min(1, 'System is required.'),
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
      areaId: '',
      equipmentId: '',
      systemId: '',
      faultId: '',
      comments: '',
    },
  });

  const { watch, reset, setValue } = form;
  const selectedAreaId = watch('areaId');
  const selectedEquipmentId = watch('equipmentId');
  const selectedSystemId = watch('systemId');

  useEffect(() => {
    if (booking) {
      reset({
        areaId: booking.areaId,
        equipmentId: booking.equipmentId,
        systemId: booking.systemId,
        faultId: booking.faultId,
        comments: booking.comments,
      });
    } else {
        // Find area for the selected equipment
        const equipmentAreaId = data.relations.areaToEquipment ? Object.keys(data.relations.areaToEquipment).find(areaId => 
            data.relations.areaToEquipment[areaId].includes(selection?.equipmentId || '')
        ) : undefined;
      reset({ 
          areaId: equipmentAreaId || '', 
          equipmentId: selection?.equipmentId || '',
          systemId: '', 
          faultId: '', 
          comments: '' 
        });
    }
  }, [booking, selection, isOpen, reset, data.relations.areaToEquipment]);
  
  const availableEquipment = useMemo(() => {
    if (!selectedAreaId || !data.relations.areaToEquipment) return [];
    const equipmentIds = data.relations.areaToEquipment[selectedAreaId] || [];
    return data.equipment.filter(e => equipmentIds.includes(e.id));
  }, [selectedAreaId, data.relations, data.equipment]);

  const availableSystems = useMemo(() => {
    if (!selectedEquipmentId || !data.relations.equipmentToSystem) return [];
    const systemIds = data.relations.equipmentToSystem[selectedEquipmentId] || [];
    return data.systems.filter(s => systemIds.includes(s.id));
  }, [selectedEquipmentId, data.relations, data.systems]);
  
  const selectedSystem = useMemo(() => {
      return data.systems.find(s => s.id === selectedSystemId) || null;
  }, [selectedSystemId, data.systems]);

  const responsibleSection = useMemo(() => {
    if (!selectedSystem) return null;
    return data.sections.find(s => s.id === selectedSystem.sectionId) || null;
  }, [selectedSystem, data.sections]);
  
  const availableFaults = useMemo(() => {
    if (!selectedSystemId || !data.relations.systemToFaults) return [];
    const faultIds = data.relations.systemToFaults[selectedSystemId] || [];
    return data.faults.filter(f => faultIds.includes(f.id));
  }, [selectedSystemId, data.relations, data.faults]);


  // Effect to reset downstream fields when upstream changes
  useEffect(() => {
    setValue('equipmentId', '');
    setValue('systemId', '');
    setValue('faultId', '');
  }, [selectedAreaId, setValue]);
  
  useEffect(() => {
    setValue('systemId', '');
    setValue('faultId', '');
  }, [selectedEquipmentId, setValue]);

  useEffect(() => {
    setValue('faultId', '');
  }, [selectedSystemId, setValue]);


  const onSubmit = (formData: BookingFormData) => {
    if (!responsibleSection) return;
    const submissionData = { ...formData, sectionId: responsibleSection.id };
    
    if (booking) {
      updateBooking({ ...booking, ...submissionData });
    } else if (selection) {
      addBooking(submissionData, selection);
    }
    onClose();
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const initialEquipment = useMemo(() => data.equipment.find(e => e.id === selection?.equipmentId), [data.equipment, selection]);


  if (!selection) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{booking ? 'Edit' : 'Create'} Booking</DialogTitle>
          <DialogDescription>
            For {initialEquipment?.name} from {formatTime(selection.startTime)} to {formatTime(selection.endTime)}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="areaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select an area" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>{data.areas.map(area => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="equipmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedAreaId}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>{availableEquipment.map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="systemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedEquipmentId}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a system" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>{availableSystems.map(system => <SelectItem key={system.id} value={system.id}>{system.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormItem>
                <FormLabel>Responsibility (Section)</FormLabel>
                <div className="flex items-center gap-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {responsibleSection ? (
                        <>
                            <div className="w-4 h-4 rounded-full" style={{backgroundColor: responsibleSection.color}}></div>
                            {responsibleSection.name}
                        </>
                    ) : (
                        <span className="text-muted-foreground">Select a system to see section</span>
                    )}
                </div>
             </FormItem>
             <FormField
              control={form.control}
              name="faultId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fault</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSystemId}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a fault" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>{availableFaults.map(fault => <SelectItem key={fault.id} value={fault.id}>{fault.name}</SelectItem>)}</SelectContent>
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

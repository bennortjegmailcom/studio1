
"use client";

import React, { useContext, useEffect, useMemo, useState } from 'react';
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
import { Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';


const bookingSchema = z.object({
  areaId: z.string().min(1, 'Area is required.'),
  equipmentId: z.string().min(1, 'Equipment is required.'),
  systemId: z.string().min(1, 'System is required.'),
  responsibilityId: z.string().min(1, 'Responsibility is required.'),
  faultId: z.string().min(1, 'Fault is required.'),
  comments: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selection: Selection | null;
  booking?: Booking | null;
  onDelete?: (bookingId: string) => void;
}

export default function BookingModal({ isOpen, onClose, selection, booking, onDelete }: BookingModalProps) {
  const context = useContext(AppContext);
  if (!context) return null;

  const { data, addBooking, updateBooking } = context;
  const [timeRange, setTimeRange] = useState([0, 0]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      areaId: '',
      equipmentId: '',
      systemId: '',
      responsibilityId: '',
      faultId: '',
      comments: '',
    },
  });

  const { watch, reset, setValue } = form;
  const selectedAreaId = watch('areaId');
  const selectedEquipmentId = watch('equipmentId');
  const selectedSystemId = watch('systemId');
  const selectedResponsibilityId = watch('responsibilityId');

  useEffect(() => {
    if (booking) {
      const areaId = data.areas.find(a => data.relations.areaToEquipment?.[a.id]?.includes(booking.equipmentId))?.id || '';
      reset({
        areaId: areaId,
        equipmentId: booking.equipmentId,
        systemId: booking.systemId,
        responsibilityId: booking.responsibilityId,
        faultId: booking.faultId,
        comments: booking.comments,
      });
      setTimeRange([booking.startTime, booking.endTime]);
    } else if (selection) {
      reset({ 
          areaId: selection.areaId || '', 
          equipmentId: selection.equipmentId || '',
          systemId: '',
          responsibilityId: '', 
          faultId: '', 
          comments: '' 
        });
      setTimeRange([selection.startTime, selection.endTime]);
    }
  }, [booking, selection, isOpen, reset, data.relations.areaToEquipment, data.areas]);
  
  const availableEquipment = useMemo(() => {
    if (!selectedAreaId || !data.relations.areaToEquipment) return [];
    const equipmentIds = data.relations.areaToEquipment[selectedAreaId] || [];
    return data.equipment.filter(e => equipmentIds.includes(e.id));
  }, [selectedAreaId, data.relations.areaToEquipment, data.equipment]);

  const availableSystems = useMemo(() => {
    if (!selectedEquipmentId || !data.relations.equipmentToSystem) return [];
    const systemIds = data.relations.equipmentToSystem[selectedEquipmentId] || [];
    return data.systems.filter(s => systemIds.includes(s.id));
  }, [selectedEquipmentId, data.relations.equipmentToSystem, data.systems]);

  const availableResponsibilities = useMemo(() => {
    if (!selectedSystemId || !data.relations.systemToResponsibilityToFaults) return [];
    const responsibilityIds = Object.keys(data.relations.systemToResponsibilityToFaults[selectedSystemId] || {});
    return data.responsibilities.filter(r => responsibilityIds.includes(r.id));
  }, [selectedSystemId, data.relations.systemToResponsibilityToFaults, data.responsibilities]);
  
  const availableFaults = useMemo(() => {
    if (!selectedSystemId || !selectedResponsibilityId || !data.relations.systemToResponsibilityToFaults) return [];
    const faultIds = data.relations.systemToResponsibilityToFaults[selectedSystemId]?.[selectedResponsibilityId] || [];
    return data.faults.filter(f => faultIds.includes(f.id));
  }, [selectedSystemId, selectedResponsibilityId, data.relations.systemToResponsibilityToFaults, data.faults]);


  // Effect to reset downstream fields when upstream changes
  useEffect(() => {
    if(!booking || watch('areaId') !== selectedAreaId) setValue('equipmentId', '');
    setValue('systemId', '');
    setValue('responsibilityId', '');
    setValue('faultId', '');
  }, [selectedAreaId, setValue, booking, watch]);
  
  useEffect(() => {
    setValue('systemId', '');
    setValue('responsibilityId', '');
    setValue('faultId', '');
  }, [selectedEquipmentId, setValue]);

  useEffect(() => {
    setValue('responsibilityId', '');
    setValue('faultId', '');
  }, [selectedSystemId, setValue]);

  useEffect(() => {
    setValue('faultId', '');
  }, [selectedResponsibilityId, setValue]);

  const onSubmit = (formData: BookingFormData) => {
    if (!selection) return;

    const finalSelection = {
        ...selection,
        equipmentId: formData.equipmentId, // Make sure equipmentId is passed
        startTime: timeRange[0],
        endTime: timeRange[1],
    };

    if (booking) {
      updateBooking({ 
          ...booking, 
          ...formData,
          startTime: timeRange[0],
          endTime: timeRange[1] 
        });
    } else {
      addBooking(formData, finalSelection);
    }
    onClose();
  };

  const handleDelete = () => {
    if(booking && onDelete) {
        onDelete(booking.id);
    }
  }

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };
  
  const formatDuration = (minutes: number) => {
    const totalMinutes = (minutes + 24*60) % (24*60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m > 0 ? `${m}min` : ''}`;
  }

  const selectedAreaName = useMemo(() => data.areas.find(a => a.id === selectedAreaId)?.name, [data.areas, selectedAreaId]);
  const selectedEquipmentName = useMemo(() => data.equipment.find(e => e.id === selectedEquipmentId)?.name, [data.equipment, selectedEquipmentId]);


  if (!selection) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{booking ? 'Edit' : 'Create'} Booking</DialogTitle>
          <DialogDescription>
            {booking ? `For ${selectedEquipmentName || '...'} in ${selectedAreaName || '...'}` : `For area: ${selectedAreaName || '...'}`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            
            <div className="space-y-3">
                <FormLabel>Time Range</FormLabel>
                <div className="p-4 rounded-lg bg-secondary">
                    <div className="flex justify-between items-center text-sm font-mono mb-2">
                        <span>{formatTime(timeRange[0])}</span>
                        <span className="text-muted-foreground text-xs">({formatDuration(timeRange[1] - timeRange[0])})</span>
                        <span>{formatTime(timeRange[1])}</span>
                    </div>
                    <Slider
                        value={timeRange}
                        onValueChange={(newRange) => setTimeRange(newRange)}
                        max={1440} // 24 * 60 minutes
                        step={5}
                        minStepsBetweenThumbs={1}
                        className="w-full"
                    />
                </div>
            </div>

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
            <FormField
              control={form.control}
              name="responsibilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsibility</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSystemId}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select responsibility" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>{availableResponsibilities.map(resp => <SelectItem key={resp.id} value={resp.id}>{resp.name}</SelectItem>)}</SelectContent>
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedResponsibilityId}>
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
            <DialogFooter className="sm:justify-between">
                <div>
                 {booking && onDelete && (
                    <Button type="button" variant="destructive" onClick={handleDelete} className="mr-auto">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                 )}
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Booking</Button>
                </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

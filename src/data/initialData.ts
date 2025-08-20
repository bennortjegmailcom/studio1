import type { AppData } from '@/lib/types';

export const initialData: AppData = {
  equipment: [
    { id: 'equip-1', name: 'Conveyor Belt A', historianTags: ['CBA_speed', 'CBA_motor_current'] },
    { id: 'equip-2', name: 'Packing Machine 1', historianTags: ['PM1_status', 'PM1_cycle_time'] },
    { id: 'equip-3', name: 'CNC Mill', historianTags: ['CNC_spindle_speed', 'CNC_axis_pos'] },
    { id: 'equip-4', name: 'Industrial Robot Arm', historianTags: ['Robot_arm_pos', 'Robot_error_code'] },
  ],
  systems: [
    { id: 'sys-1', name: 'Drive System' },
    { id: 'sys-2', name: 'Packaging System' },
    { id: 'sys-3', name: 'Control System' },
    { id: 'sys-4', name: 'Mechanical Frame' },
  ],
  faults: [
    { id: 'fault-1', name: 'Trip' },
    { id: 'fault-2', name: 'Jam' },
    { id: 'fault-3', name: 'Overload' },
    { id: 'fault-4', name: 'Alignment Issue' },
  ],
  sections: [
    { id: 'sec-1', name: 'Mechanical', color: '#3b82f6' }, // blue
    { id: 'sec-2', name: 'Electrical', color: '#f59e0b' }, // amber
    { id: 'sec-3', name: 'Software', color: '#10b981' }, // emerald
    { id: 'sec-4', name: 'Operations', color: '#6366f1' }, // indigo
  ],
  bookings: [
    {
      id: 'booking-1',
      equipmentId: 'equip-1',
      date: new Date().toISOString().split('T')[0],
      startTime: 60, // 01:00
      endTime: 120, // 02:00
      systemId: 'sys-1',
      sectionId: 'sec-2',
      faultId: 'fault-1',
      comments: 'Motor tripped due to overload.',
    },
    {
      id: 'booking-2',
      equipmentId: 'equip-2',
      date: new Date().toISOString().split('T')[0],
      startTime: 240, // 04:00
      endTime: 285, // 04:45
      systemId: 'sys-2',
      sectionId: 'sec-1',
      faultId: 'fault-2',
      comments: 'Box jam in the main chute.',
    },
  ],
  relations: {
    equipmentToSystem: {
      'equip-1': ['sys-1', 'sys-4'],
      'equip-2': ['sys-2', 'sys-3', 'sys-4'],
      'equip-3': ['sys-1', 'sys-3', 'sys-4'],
      'equip-4': ['sys-1', 'sys-3'],
    },
    systemToDetails: {
      'sys-1': { sections: ['sec-1', 'sec-2'], faults: ['fault-1', 'fault-3'] },
      'sys-2': { sections: ['sec-1', 'sec-4'], faults: ['fault-2'] },
      'sys-3': { sections: ['sec-2', 'sec-3'], faults: ['fault-1'] },
      'sys-4': { sections: ['sec-1'], faults: ['fault-4'] },
    },
  },
};

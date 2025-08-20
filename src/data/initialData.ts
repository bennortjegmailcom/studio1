import type { AppData } from '@/lib/types';

export const initialData: AppData = {
  areas: [
    { id: 'area-1', name: 'Dispatch Area' },
    { id: 'area-2', name: 'Processing Area' },
    { id: 'area-3', name: 'Packaging Area' },
  ],
  equipment: [
    { id: 'equip-1', name: 'Conveyor Belt A', historianTags: ['CBA_speed', 'CBA_motor_current'] },
    { id: 'equip-2', name: 'Packing Machine 1', historianTags: ['PM1_status', 'PM1_cycle_time'] },
    { id: 'equip-3', name: 'CNC Mill', historianTags: ['CNC_spindle_speed', 'CNC_axis_pos'] },
    { id: 'equip-4', name: 'Industrial Robot Arm', historianTags: ['Robot_arm_pos', 'Robot_error_code'] },
    { id: 'equip-5', name: 'Conveyor Belt B', historianTags: ['CBB_speed', 'CBB_motor_current'] },
  ],
  systems: [
    { id: 'sys-1', name: 'Drive Motor', sectionId: 'sec-2' },
    { id: 'sys-2', name: 'Packaging Head', sectionId: 'sec-1' },
    { id: 'sys-3', name: 'Main Controller', sectionId: 'sec-3' },
    { id: 'sys-4', name: 'Chassis/Frame', sectionId: 'sec-1' },
    { id: 'sys-5', name: 'Conveyor Belt', sectionId: 'sec-1' },
    { id: 'sys-6', name: 'Safety Sensor', sectionId: 'sec-2' },
  ],
  faults: [
    { id: 'fault-1', name: 'Trip' },
    { id: 'fault-2', name: 'Jam' },
    { id: 'fault-3', name: 'Overload' },
    { id: 'fault-4', name: 'Alignment Issue' },
    { id: 'fault-5', name: 'E-Stop' },
    { id: 'fault-6', name: 'Communication Error' },
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
      areaId: 'area-1',
      equipmentId: 'equip-1',
      date: new Date().toISOString().split('T')[0],
      startTime: 60, // 01:00
      endTime: 120, // 02:00
      systemId: 'sys-1',
      sectionId: 'sec-2',
      faultId: 'fault-3',
      comments: 'Motor tripped due to overload.',
    },
    {
      id: 'booking-2',
      areaId: 'area-3',
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
    areaToEquipment: {
      'area-1': ['equip-1', 'equip-5'],
      'area-2': ['equip-3', 'equip-4'],
      'area-3': ['equip-2'],
    },
    equipmentToSystem: {
      'equip-1': ['sys-1', 'sys-5', 'sys-6'],
      'equip-2': ['sys-2', 'sys-3', 'sys-4'],
      'equip-3': ['sys-1', 'sys-3', 'sys-4'],
      'equip-4': ['sys-1', 'sys-3', 'sys-6'],
      'equip-5': ['sys-1', 'sys-5'],
    },
    systemToFaults: {
      'sys-1': ['fault-1', 'fault-3'], // Drive Motor (Electrical)
      'sys-2': ['fault-2', 'fault-4'], // Packaging Head (Mechanical)
      'sys-3': ['fault-6'],             // Main Controller (Software)
      'sys-4': ['fault-4'],             // Chassis (Mechanical)
      'sys-5': ['fault-2', 'fault-4'], // Conveyor Belt (Mechanical)
      'sys-6': ['fault-5', 'fault-1'], // Safety Sensor (Electrical)
    },
  },
};

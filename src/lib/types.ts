export interface Section {
  id: string;
  name: string;
  color: string;
}

export interface Fault {
  id: string;
  name: string;
}

export interface System {
  id: string;
  name: string;
  sectionId: string;
}

export interface Equipment {
  id: string;
  name: string;
  historianTags: string[];
}

export interface Area {
    id: string;
    name: string;
}

export interface Booking {
  id: string;
  areaId: string;
  equipmentId: string;
  startTime: number; // minutes from midnight
  endTime: number; // minutes from midnight
  systemId: string;
  sectionId: string;
  faultId: string;
  comments: string;
  date: string; // "YYYY-MM-DD"
}

export interface Relations {
  areaToEquipment: Record<string, string[]>; // areaId -> equipmentId[]
  equipmentToSystem: Record<string, string[]>; // equipmentId -> systemId[]
  systemToFaults: Record<string, string[]>; // systemId -> faultId[]
}

export interface AppData {
  areas: Area[];
  equipment: Equipment[];
  systems: System[];
  faults: Fault[];
  sections: Section[];
  bookings: Booking[];
  relations: Relations;
}

export interface Selection {
  equipmentId: string;
  startTime: number;
  endTime: number;
}

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
}

export interface Equipment {
  id: string;
  name: string;
  historianTags: string[];
}

export interface Booking {
  id: string;
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
  equipmentToSystem: Record<string, string[]>; // equipmentId -> systemId[]
  systemToDetails: Record<string, { sections: string[]; faults: string[] }>; // systemId -> { sections: sectionId[], faults: faultId[] }
}

export interface AppData {
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

export type Role = 'leader' | 'teammate';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Teammate {
  id: string;
  name: string;
  email: string;
  role: string; // Job role like "Developer", "Designer"
  dailyCapacity: number; // hours per day
  workingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string; // teammate id
  assignedBy: string; // leader id
  assignedByName: string;
  date: string; // ISO date string YYYY-MM-DD
  estimatedHours: number;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
}

export interface DayCapacity {
  date: string;
  totalCapacity: number;
  usedCapacity: number;
  tasks: Task[];
}

export type CapacityStatus = 'low' | 'medium' | 'high' | 'empty';

export interface CellData {
  teammateId: string;
  date: string;
  capacity: DayCapacity;
  status: CapacityStatus;
}

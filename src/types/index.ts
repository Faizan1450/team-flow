export type AppRole = 'owner' | 'leader' | 'teammate';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Teammate {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  job_role: string;
  daily_capacity: number;
  working_days: number[];
  avatar_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  assigned_by?: string;
  assigned_by_name: string;
  date: string;
  estimated_hours: number;
  status: 'pending' | 'in-progress' | 'completed';
  is_self_assigned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

// Auth context types
export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
  roles: AppRole[];
}

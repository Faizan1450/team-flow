import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Teammate, Task, Role } from '@/types';
import { mockUsers, mockTeammates, mockTasks } from '@/data/mockData';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  teammates: Teammate[];
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  switchRole: (role: Role) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(mockUsers[0]);
  const [teammates] = useState<Teammate[]>(mockTeammates);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const switchRole = (role: Role) => {
    if (role === 'leader') {
      setCurrentUser(mockUsers[0]);
    } else {
      // For demo, create a teammate user
      setCurrentUser({
        id: 'tm-1',
        name: 'Alex Johnson',
        email: 'alex@capacify.io',
        role: 'teammate',
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        teammates,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        switchRole,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

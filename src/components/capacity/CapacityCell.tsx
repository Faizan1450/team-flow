import { DayCapacity, CapacityStatus } from '@/types';
import { cn } from '@/lib/utils';
import { formatCapacityDisplay, getCapacityPercentage } from '@/lib/capacity';

interface CapacityCellProps {
  capacity: DayCapacity;
  status: CapacityStatus;
  onClick: () => void;
  isToday?: boolean;
}

export function CapacityCell({ capacity, status, onClick, isToday }: CapacityCellProps) {
  const percentage = getCapacityPercentage(capacity);
  
  const statusStyles: Record<CapacityStatus, string> = {
    low: 'bg-capacity-low/20 hover:bg-capacity-low/30 border-capacity-low/40',
    medium: 'bg-capacity-medium/20 hover:bg-capacity-medium/30 border-capacity-medium/40',
    high: 'bg-capacity-high/20 hover:bg-capacity-high/30 border-capacity-high/40',
    empty: 'bg-muted/50 hover:bg-muted border-transparent',
  };

  const indicatorStyles: Record<CapacityStatus, string> = {
    low: 'bg-capacity-low',
    medium: 'bg-capacity-medium',
    high: 'bg-capacity-high',
    empty: 'bg-muted-foreground/20',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative h-14 w-full rounded-md border transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        statusStyles[status],
        isToday && 'ring-2 ring-primary/30'
      )}
    >
      {/* Capacity bar */}
      {status !== 'empty' && capacity.totalCapacity > 0 && (
        <div className="absolute inset-x-1 bottom-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', indicatorStyles[status])}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="flex flex-col items-center justify-center h-full pt-0.5">
        <span className={cn(
          'text-xs font-medium',
          status === 'empty' ? 'text-muted-foreground/60' : 'text-foreground'
        )}>
          {formatCapacityDisplay(capacity)}
        </span>
        {capacity.tasks.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {capacity.tasks.length} task{capacity.tasks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  );
}

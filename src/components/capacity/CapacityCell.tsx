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
    low: 'bg-capacity-low/15 hover:bg-capacity-low/25 border-capacity-low/30',
    medium: 'bg-capacity-medium/15 hover:bg-capacity-medium/25 border-capacity-medium/30',
    high: 'bg-capacity-high/15 hover:bg-capacity-high/25 border-capacity-high/30',
    empty: 'bg-muted/30 hover:bg-muted/50 border-border/50',
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
        'relative h-16 w-full rounded-xl border-2 transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
        'card-hover',
        statusStyles[status],
        isToday && 'ring-2 ring-primary/40 ring-offset-1'
      )}
    >
      {/* Capacity bar */}
      {status !== 'empty' && capacity.totalCapacity > 0 && (
        <div className="absolute inset-x-2 bottom-2 h-1.5 rounded-full bg-foreground/5 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', indicatorStyles[status])}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="flex flex-col items-center justify-center h-full pt-0.5">
        <span className={cn(
          'text-sm font-bold',
          status === 'empty' ? 'text-muted-foreground/50' : 'text-foreground'
        )}>
          {formatCapacityDisplay(capacity)}
        </span>
        {capacity.tasks.length > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {capacity.tasks.length} task{capacity.tasks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  );
}

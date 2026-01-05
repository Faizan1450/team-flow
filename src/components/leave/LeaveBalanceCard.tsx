import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Thermometer, Clock } from 'lucide-react';

interface LeaveBalanceCardProps {
  casualLeave: number;
  sickLeave: number;
  compOff: number;
  year: number;
}

export function LeaveBalanceCard({ casualLeave, sickLeave, compOff, year }: LeaveBalanceCardProps) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Leave Balance</CardTitle>
          <Badge variant="outline">{year}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center p-4 rounded-xl bg-primary/10 border border-primary/20">
            <Calendar className="h-6 w-6 text-primary mb-2" />
            <span className="text-2xl font-bold text-primary">{casualLeave}</span>
            <span className="text-xs text-muted-foreground">Casual Leave</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Thermometer className="h-6 w-6 text-orange-500 mb-2" />
            <span className="text-2xl font-bold text-orange-500">{sickLeave}</span>
            <span className="text-xs text-muted-foreground">Sick Leave</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-accent/10 border border-accent/20">
            <Clock className="h-6 w-6 text-accent mb-2" />
            <span className="text-2xl font-bold text-accent">{compOff}</span>
            <span className="text-xs text-muted-foreground">Comp Off</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

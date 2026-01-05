import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, X, Loader2 } from 'lucide-react';
import { LeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest } from '@/hooks/useLeaveManagement';
import { useTeammates } from '@/hooks/useTeammates';
import { useAuth } from '@/contexts/AuthContext';

interface LeaveRequestsTableProps {
  requests: LeaveRequest[];
  showActions?: boolean;
}

export function LeaveRequestsTable({ requests, showActions = true }: LeaveRequestsTableProps) {
  const { isOwner, isLeader } = useAuth();
  const { data: teammates = [] } = useTeammates();
  const approveRequest = useApproveLeaveRequest();
  const rejectRequest = useRejectLeaveRequest();

  const getTeammateName = (teammateId: string) => {
    const teammate = teammates.find(t => t.id === teammateId);
    return teammate?.name || 'Unknown';
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'casual':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Casual</Badge>;
      case 'sick':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Sick</Badge>;
      case 'comp_off':
        return <Badge className="bg-accent/10 text-accent border-accent/20">Comp Off</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No leave requests found
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Teammate</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            {showActions && (isOwner || isLeader) && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{getTeammateName(request.teammate_id)}</TableCell>
              <TableCell>{getLeaveTypeBadge(request.leave_type)}</TableCell>
              <TableCell>
                {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>{request.days_count}</TableCell>
              <TableCell className="max-w-[200px] truncate">{request.reason || '-'}</TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              {showActions && (isOwner || isLeader) && (
                <TableCell className="text-right">
                  {request.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                        onClick={() => approveRequest.mutate(request.id)}
                        disabled={approveRequest.isPending}
                      >
                        {approveRequest.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => rejectRequest.mutate(request.id)}
                        disabled={rejectRequest.isPending}
                      >
                        {rejectRequest.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

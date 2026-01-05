import { format } from 'date-fns';
import { 
  LeaveRequest, 
  CompOffRequest,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useApproveCompOffRequest,
  useRejectCompOffRequest
} from '@/hooks/useLeaveManagement';
import { Teammate } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CalendarDays, 
  Clock, 
  Check, 
  X, 
  Loader2, 
  FileCheck,
  Inbox 
} from 'lucide-react';

interface LeaveApprovalPanelProps {
  pendingLeaveRequests: LeaveRequest[];
  pendingCompOffRequests: CompOffRequest[];
  teammates: Teammate[];
}

export function LeaveApprovalPanel({ 
  pendingLeaveRequests, 
  pendingCompOffRequests,
  teammates 
}: LeaveApprovalPanelProps) {
  const approveLeave = useApproveLeaveRequest();
  const rejectLeave = useRejectLeaveRequest();
  const approveCompOff = useApproveCompOffRequest();
  const rejectCompOff = useRejectCompOffRequest();

  const getTeammateName = (teammateId: string) => {
    return teammates.find(t => t.id === teammateId)?.name || 'Unknown';
  };

  const getTeammateAvatar = (teammateId: string) => {
    return teammates.find(t => t.id === teammateId)?.avatar_url;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  if (pendingLeaveRequests.length === 0 && pendingCompOffRequests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No Pending Requests</h3>
          <p className="text-muted-foreground text-center mt-1">
            All leave and comp-off requests have been processed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Pending Approvals
        </CardTitle>
        <CardDescription>
          Review and approve/reject leave and comp-off requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="leave">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leave" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Leave Requests
              {pendingLeaveRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingLeaveRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="compoff" className="gap-2">
              <Clock className="h-4 w-4" />
              Comp-Off Requests
              {pendingCompOffRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingCompOffRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leave" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {pendingLeaveRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending leave requests
                  </div>
                ) : (
                  pendingLeaveRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 rounded-xl bg-secondary/50 border border-border/50"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getTeammateAvatar(request.teammate_id) || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(getTeammateName(request.teammate_id))}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{getTeammateName(request.teammate_id)}</p>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(request.created_at), 'MMM d')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1 text-sm">
                            <Badge variant="outline">
                              {format(new Date(request.start_date), 'MMM d')}
                              {request.start_date !== request.end_date && (
                                <> - {format(new Date(request.end_date), 'MMM d')}</>
                              )}
                            </Badge>
                            <span className="text-muted-foreground">
                              {request.hours_requested} hours
                            </span>
                            {request.is_partial && (
                              <Badge variant="secondary" className="text-xs">Partial</Badge>
                            )}
                          </div>
                          
                          {request.reason && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {request.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rejectLeave.mutate(request.id)}
                          disabled={rejectLeave.isPending || approveLeave.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {rejectLeave.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveLeave.mutate(request.id)}
                          disabled={approveLeave.isPending || rejectLeave.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {approveLeave.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compoff" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {pendingCompOffRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending comp-off requests
                  </div>
                ) : (
                  pendingCompOffRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 rounded-xl bg-secondary/50 border border-border/50"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getTeammateAvatar(request.teammate_id) || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(getTeammateName(request.teammate_id))}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{getTeammateName(request.teammate_id)}</p>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(request.created_at), 'MMM d')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1 text-sm">
                            <Badge variant="outline">
                              Worked: {format(new Date(request.work_date), 'MMM d, yyyy')}
                            </Badge>
                            <span className="text-muted-foreground">
                              {request.hours_earned} hours to earn
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-2">
                            {request.reason}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rejectCompOff.mutate(request.id)}
                          disabled={rejectCompOff.isPending || approveCompOff.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {rejectCompOff.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveCompOff.mutate(request.id)}
                          disabled={approveCompOff.isPending || rejectCompOff.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {approveCompOff.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

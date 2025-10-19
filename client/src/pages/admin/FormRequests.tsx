// @ts-nocheck
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Mail, Phone, ExternalLink, RefreshCw, Loader2, CheckCircle2, Clock, Archive } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const FORM_TABS = [
  { value: 'all', label: 'All Requests' },
  { value: 'contact_sales', label: 'Sales Inquiries' },
  { value: 'support_ticket', label: 'Support Tickets' },
  { value: 'report_abuse', label: 'Abuse Reports' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  archived: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_ACTIONS = [
  { value: 'in_progress', label: 'Mark in progress', icon: Clock },
  { value: 'resolved', label: 'Mark resolved', icon: CheckCircle2 },
  { value: 'archived', label: 'Archive', icon: Archive },
];

export default function AdminFormRequests() {
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  if (!user || !user.email?.includes('admin')) {
    return (
      <div className="container mx-auto py-16">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Access denied. Admin privileges required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [`/api/admin/form-requests?formType=${activeTab}&status=${statusFilter}`],
  });

  const requests = data?.requests || [];

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/form-requests/${id}`, { status });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Unable to update request status');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/form-requests?formType=${activeTab}&status=${statusFilter}`] });
      toast({
        title: 'Request updated',
        description: 'The request status has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Unable to update request status.',
        variant: 'destructive',
      });
    },
  });

  const groupedRequests = requests;

  return (
    <AdminLayout>
      <div className="p-8 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Customer Requests</h1>
            <p className="text-sm text-zinc-400">
              Track every form submission from marketing pages, trust & safety, and support.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="text-white border-zinc-700">
            {isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-white">Request Filters</CardTitle>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                  <TabsList className="bg-zinc-800/60 border border-zinc-700">
                    {FORM_TABS.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                Loading requests...
              </div>
            ) : groupedRequests.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-zinc-500">
                <CheckCircle2 className="h-10 w-10 mb-3" />
                <p className="font-medium">No requests to show</p>
                <p className="text-sm text-zinc-500 mt-1 text-center max-w-md">
                  Once customers reach out through sales, support, or trust & safety forms, their submissions will appear here.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Received</TableHead>
                      <TableHead className="text-zinc-400">Source</TableHead>
                      <TableHead className="text-zinc-400">Sender</TableHead>
                      <TableHead className="text-zinc-400">Request</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-right text-zinc-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRequests.map((request: any) => {
                      const statusClass = STATUS_STYLES[request.status] || STATUS_STYLES.new;
                      const createdAt = request.createdAt ? new Date(request.createdAt) : null;
                      return (
                        <TableRow key={request.id} className="border-zinc-900 hover:bg-zinc-800/50">
                          <TableCell className="text-sm text-zinc-300">
                            {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-300">
                            <div className="flex flex-col">
                              <span className="font-medium capitalize">
                                {request.formType?.replace('_', ' ') || 'Request'}
                              </span>
                              <span className="text-xs text-zinc-500">{request.pagePath || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-zinc-300">
                            <div className="space-y-1">
                              <p className="font-medium text-white">{request.name || request.senderName || 'Unknown contact'}</p>
                              {request.senderCompany ? (
                                <p className="text-xs text-zinc-500">{request.senderCompany}</p>
                              ) : null}
                              {request.email || request.senderEmail ? (
                                <p className="flex items-center gap-2 text-xs text-blue-400">
                                  <Mail className="h-3 w-3" />
                                  {request.email || request.senderEmail}
                                </p>
                              ) : null}
                              {request.phone || request.senderPhone ? (
                                <p className="flex items-center gap-2 text-xs text-zinc-500">
                                  <Phone className="h-3 w-3" />
                                  {request.phone || request.senderPhone}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-zinc-300">
                            <div className="space-y-1">
                              {request.subject ? (
                                <p className="font-medium text-white">{request.subject}</p>
                              ) : null}
                              {request.metadata?.issueType ? (
                                <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-transparent">
                                  {request.metadata.issueType.replace('_', ' ')}
                                </Badge>
                              ) : null}
                              <p className="text-xs text-zinc-400 whitespace-pre-wrap">
                                {request.message?.slice(0, 200) || '—'}
                                {request.message && request.message.length > 200 ? '…' : ''}
                              </p>
                              {request.metadata?.targetUrl ? (
                                <a
                                  href={request.metadata.targetUrl}
                                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {request.metadata.targetUrl}
                                </a>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusClass} border`}>{request.status?.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-2">
                              {STATUS_ACTIONS.map((action) => {
                                const Icon = action.icon;
                                const disabled = updateStatus.isLoading || request.status === action.value;
                                return (
                                  <Button
                                    key={action.value}
                                    size="sm"
                                    variant="outline"
                                    disabled={disabled}
                                    className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                                    onClick={() => updateStatus.mutate({ id: request.id, status: action.value })}
                                  >
                                    {updateStatus.isLoading && updateStatus.variables?.id === request.id &&
                                    updateStatus.variables?.status === action.value ? (
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Icon className="mr-2 h-3 w-3" />
                                    )}
                                    <span className="text-xs">{action.label}</span>
                                  </Button>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

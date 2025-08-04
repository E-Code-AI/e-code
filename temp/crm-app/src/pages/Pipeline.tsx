import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuthStore } from '../stores/authStore';
import { DollarSign, Calendar, User, ChevronRight } from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  customer: string;
  amount: number;
  stage: string;
  probability: number;
  expectedCloseDate: string;
  assignedTo: string;
}

interface Pipeline {
  qualification: Deal[];
  proposal: Deal[];
  negotiation: Deal[];
  closing: Deal[];
  closed: Deal[];
  lost: Deal[];
}

export function Pipeline() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: pipeline = {
    qualification: [],
    proposal: [],
    negotiation: [],
    closing: [],
    closed: [],
    lost: []
  }, isLoading } = useQuery<Pipeline>(
    'pipeline',
    async () => {
      const response = await fetch('http://localhost:3002/api/pipeline', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    }
  );

  const updateDealStageMutation = useMutation(
    async ({ dealId, stage }: { dealId: string; stage: string }) => {
      const response = await fetch(`http://localhost:3002/api/deals/${dealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage }),
      });
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pipeline');
        queryClient.invalidateQueries('deals');
      },
    }
  );

  const stages = [
    { key: 'qualification', label: 'Qualification', color: 'bg-blue-50 border-blue-200' },
    { key: 'proposal', label: 'Proposal', color: 'bg-yellow-50 border-yellow-200' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-50 border-orange-200' },
    { key: 'closing', label: 'Closing', color: 'bg-purple-50 border-purple-200' },
    { key: 'closed', label: 'Closed Won', color: 'bg-green-50 border-green-200' },
    { key: 'lost', label: 'Closed Lost', color: 'bg-red-50 border-red-200' },
  ];

  const calculateStageTotal = (deals: Deal[]) => {
    return deals.reduce((sum, deal) => sum + deal.amount, 0);
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('dealId', dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    updateDealStageMutation.mutate({ dealId, stage });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
        <p className="text-gray-600">Drag and drop deals to move them through stages</p>
      </div>

      {/* Pipeline View */}
      <div className="overflow-x-auto pb-4">
        <div className="flex space-x-4 min-w-max">
          {stages.map((stage) => {
            const deals = pipeline[stage.key as keyof Pipeline] || [];
            const total = calculateStageTotal(deals);

            return (
              <div
                key={stage.key}
                className={`w-80 flex-shrink-0 ${stage.color} border rounded-lg`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                    <span className="text-sm text-gray-500">{deals.length} deals</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    ${total.toLocaleString()}
                  </p>
                </div>

                <div className="p-2 space-y-2 min-h-[400px]">
                  {deals.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      No deals in this stage
                    </div>
                  ) : (
                    deals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-move hover:shadow-md transition-shadow"
                      >
                        <div className="font-medium text-gray-900 mb-1">
                          {deal.name}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {deal.customer}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-gray-700">
                            <DollarSign className="w-4 h-4 mr-1" />
                            ${deal.amount.toLocaleString()}
                          </span>
                          <span className="text-gray-500">
                            {deal.probability}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(deal.expectedCloseDate).toLocaleDateString()}
                          </span>
                          {stage.key !== 'closed' && stage.key !== 'lost' && (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <h4 className="text-sm font-medium text-gray-600">Total Pipeline Value</h4>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${Object.values(pipeline)
              .flat()
              .filter((d: Deal) => !['closed', 'lost'].includes(d.stage))
              .reduce((sum, deal) => sum + deal.amount, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="stat-card">
          <h4 className="text-sm font-medium text-gray-600">Weighted Value</h4>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${Object.values(pipeline)
              .flat()
              .filter((d: Deal) => !['closed', 'lost'].includes(d.stage))
              .reduce((sum, deal) => sum + (deal.amount * deal.probability / 100), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="stat-card">
          <h4 className="text-sm font-medium text-gray-600">Won This Month</h4>
          <p className="text-2xl font-bold text-green-600 mt-1">
            ${(pipeline.closed || [])
              .reduce((sum, deal) => sum + deal.amount, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="stat-card">
          <h4 className="text-sm font-medium text-gray-600">Win Rate</h4>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(() => {
              const won = (pipeline.closed || []).length;
              const total = won + (pipeline.lost || []).length;
              return total > 0 ? Math.round((won / total) * 100) : 0;
            })()}%
          </p>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuthStore } from '../stores/authStore';
import { Plus, Search, Filter, DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  customer: string;
  amount: number;
  stage: string;
  probability: number;
  expectedCloseDate: string;
  assignedTo: string;
  createdAt: string;
  status?: string;
}

export function Deals() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: deals = [], isLoading } = useQuery<Deal[]>(
    'deals',
    async () => {
      const response = await fetch('http://localhost:3002/api/deals', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    }
  );

  const createDealMutation = useMutation(
    async (data: Partial<Deal>) => {
      const response = await fetch('http://localhost:3002/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deals');
      },
    }
  );

  const updateDealMutation = useMutation(
    async ({ id, ...data }: Partial<Deal> & { id: string }) => {
      const response = await fetch(`http://localhost:3002/api/deals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deals');
      },
    }
  );

  const filteredDeals = deals.filter(
    (deal) =>
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStageBadgeClass = (stage: string) => {
    switch (stage) {
      case 'qualification':
        return 'badge badge-info';
      case 'proposal':
        return 'badge badge-warning';
      case 'negotiation':
        return 'badge badge-warning';
      case 'closing':
        return 'badge badge-success';
      case 'closed':
        return 'badge badge-default';
      case 'lost':
        return 'badge badge-danger';
      default:
        return 'badge badge-default';
    }
  };

  const totalPipelineValue = deals
    .filter(d => d.stage !== 'closed' && d.stage !== 'lost')
    .reduce((sum, deal) => sum + deal.amount, 0);

  const weightedPipelineValue = deals
    .filter(d => d.stage !== 'closed' && d.stage !== 'lost')
    .reduce((sum, deal) => sum + (deal.amount * deal.probability / 100), 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-600">Manage your sales opportunities</p>
        </div>
        <button
          onClick={() => {
            const newDeal = {
              name: 'New Deal',
              customer: 'Customer Name',
              amount: 10000,
            };
            createDealMutation.mutate(newDeal);
          }}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Deal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pipeline Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalPipelineValue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Weighted Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${Math.round(weightedPipelineValue).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Deals</p>
              <p className="text-2xl font-bold text-gray-900">
                {deals.filter(d => d.stage !== 'closed' && d.stage !== 'lost').length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <button className="btn btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredDeals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No deals found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left table-header">Deal</th>
                  <th className="px-6 py-3 text-left table-header">Customer</th>
                  <th className="px-6 py-3 text-left table-header">Value</th>
                  <th className="px-6 py-3 text-left table-header">Stage</th>
                  <th className="px-6 py-3 text-left table-header">Probability</th>
                  <th className="px-6 py-3 text-left table-header">Close Date</th>
                  <th className="px-6 py-3 text-left table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {deal.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {deal.customer}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          ${deal.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Weighted: ${Math.round(deal.amount * deal.probability / 100).toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStageBadgeClass(deal.stage)}>
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${deal.probability}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{deal.probability}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(deal.expectedCloseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="select select-sm"
                        value={deal.stage}
                        onChange={(e) =>
                          updateDealMutation.mutate({
                            id: deal.id,
                            stage: e.target.value,
                          })
                        }
                      >
                        <option value="qualification">Qualification</option>
                        <option value="proposal">Proposal</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="closing">Closing</option>
                        <option value="closed">Closed Won</option>
                        <option value="lost">Closed Lost</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuthStore } from '../stores/authStore';
import { Plus, Search, Filter, UserCheck, TrendingUp, AlertCircle } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  source: string;
  status: string;
  score: number;
  assignedTo: string;
  createdAt: string;
}

export function Leads() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: leads = [], isLoading } = useQuery<Lead[]>(
    'leads',
    async () => {
      const response = await fetch('http://localhost:3002/api/leads', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    }
  );

  const createLeadMutation = useMutation(
    async (data: Partial<Lead>) => {
      const response = await fetch('http://localhost:3002/api/leads', {
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
        queryClient.invalidateQueries('leads');
      },
    }
  );

  const convertLeadMutation = useMutation(
    async (leadId: string) => {
      const response = await fetch(`http://localhost:3002/api/leads/${leadId}/convert`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('leads');
        queryClient.invalidateQueries('customers');
      },
    }
  );

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return 'badge badge-info';
      case 'contacted':
        return 'badge badge-warning';
      case 'qualified':
        return 'badge badge-success';
      case 'converted':
        return 'badge badge-default';
      default:
        return 'badge badge-default';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Track and convert your sales leads</p>
        </div>
        <button
          onClick={() => {
            // In a real app, this would open a modal
            const newLead = {
              name: 'New Lead',
              email: 'lead@example.com',
              phone: '123-456-7890',
              company: 'Example Corp',
              industry: 'Technology',
              source: 'Website',
            };
            createLeadMutation.mutate(newLead);
          }}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hot Leads</p>
              <p className="text-2xl font-bold text-gray-900">
                {leads.filter(l => l.score >= 80).length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Qualified</p>
              <p className="text-2xl font-bold text-gray-900">
                {leads.filter(l => l.status === 'qualified').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {leads.length > 0 
                  ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100)
                  : 0}%
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-purple-500" />
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
                placeholder="Search leads..."
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
        ) : filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No leads found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left table-header">Lead</th>
                  <th className="px-6 py-3 text-left table-header">Company</th>
                  <th className="px-6 py-3 text-left table-header">Source</th>
                  <th className="px-6 py-3 text-left table-header">Score</th>
                  <th className="px-6 py-3 text-left table-header">Status</th>
                  <th className="px-6 py-3 text-left table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.name}
                        </div>
                        <div className="text-sm text-gray-500">{lead.email}</div>
                        <div className="text-sm text-gray-500">{lead.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900">{lead.company}</div>
                        <div className="text-sm text-gray-500">{lead.industry}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {lead.source}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className={`text-2xl font-bold ${getScoreColor(lead.score)}`}>
                          {lead.score}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClass(lead.status)}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lead.status !== 'converted' && (
                        <button
                          onClick={() => convertLeadMutation.mutate(lead.id)}
                          className="btn btn-sm btn-success"
                        >
                          Convert
                        </button>
                      )}
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
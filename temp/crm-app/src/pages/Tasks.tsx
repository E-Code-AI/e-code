import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuthStore } from '../stores/authStore';
import { Plus, CheckCircle, Circle, Calendar, Clock, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  relatedTo: string;
  relatedType: 'customer' | 'lead' | 'deal';
  completed: boolean;
  completedAt?: string;
  assignedTo: string;
  createdAt: string;
}

export function Tasks() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');

  const { data: tasks = [], isLoading } = useQuery<Task[]>(
    'tasks',
    async () => {
      const response = await fetch('http://localhost:3002/api/tasks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    }
  );

  const createTaskMutation = useMutation(
    async (data: Partial<Task>) => {
      const response = await fetch('http://localhost:3002/api/tasks', {
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
        queryClient.invalidateQueries('tasks');
      },
    }
  );

  const completeTaskMutation = useMutation(
    async (taskId: string) => {
      const response = await fetch(`http://localhost:3002/api/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
      },
    }
  );

  const filteredTasks = tasks.filter((task) => {
    if (!showCompleted && task.completed) return false;
    
    if (filter === 'today') {
      const today = new Date().toDateString();
      const taskDate = new Date(task.dueDate).toDateString();
      return today === taskDate;
    }
    
    if (filter === 'week') {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const taskDate = new Date(task.dueDate);
      return taskDate <= weekFromNow;
    }
    
    return true;
  });

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && !tasks.find(t => t.dueDate === dueDate)?.completed;
  };

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const todayTasks = tasks.filter(t => {
    const today = new Date().toDateString();
    return new Date(t.dueDate).toDateString() === today && !t.completed;
  }).length;
  const overdueTasks = tasks.filter(t => isOverdue(t.dueDate)).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600">Manage your daily activities</p>
        </div>
        <button
          onClick={() => {
            const newTask = {
              title: 'New Task',
              description: 'Task description',
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              priority: 'medium' as const,
              relatedTo: 'General',
              relatedType: 'customer' as const,
            };
            createTaskMutation.mutate(newTask);
          }}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{pendingTasks}</p>
            </div>
            <Circle className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Due Today</p>
              <p className="text-2xl font-bold text-gray-900">{todayTasks}</p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{overdueTasks}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.completed).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Filter:</label>
            <select
              className="select select-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">All Tasks</option>
              <option value="today">Due Today</option>
              <option value="week">Due This Week</option>
            </select>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show completed</span>
          </label>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No tasks found</div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${
                task.completed ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start">
                <button
                  onClick={() => !task.completed && completeTaskMutation.mutate(task.id)}
                  className="mr-3 mt-0.5"
                  disabled={task.completed}
                >
                  {task.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-medium text-gray-900 ${
                        task.completed ? 'line-through' : ''
                      }`}>
                        {task.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getPriorityClass(task.priority)
                        }`}>
                          {task.priority} priority
                        </span>
                        <span className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        {isOverdue(task.dueDate) && (
                          <span className="text-sm text-red-600 font-medium">Overdue</span>
                        )}
                        <span className="text-sm text-gray-500">
                          Related to: {task.relatedTo} ({task.relatedType})
                        </span>
                      </div>
                    </div>
                    {task.completed && task.completedAt && (
                      <span className="text-xs text-gray-500">
                        Completed {new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
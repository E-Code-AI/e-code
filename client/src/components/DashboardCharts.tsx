import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { usePrefersReducedMotion } from '@/lib/performance';

// Mock data for charts
const weeklyActivityData = [
  { day: 'Mon', commits: 12, deploys: 3, builds: 8 },
  { day: 'Tue', commits: 19, deploys: 5, builds: 12 },
  { day: 'Wed', commits: 15, deploys: 2, builds: 10 },
  { day: 'Thu', commits: 25, deploys: 7, builds: 15 },
  { day: 'Fri', commits: 22, deploys: 6, builds: 18 },
  { day: 'Sat', commits: 8, deploys: 1, builds: 5 },
  { day: 'Sun', commits: 5, deploys: 0, builds: 3 },
];

const storageData = [
  { name: 'Code', value: 35, color: '#3b82f6' },
  { name: 'Assets', value: 25, color: '#10b981' },
  { name: 'Databases', value: 20, color: '#f59e0b' },
  { name: 'Logs', value: 10, color: '#ef4444' },
  { name: 'Free', value: 10, color: '#9ca3af' },
];

const DashboardCharts = memo(function DashboardCharts({ projects }: { projects: any[] }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const chartAnimation = useMemo(() => ({
    animationBegin: prefersReducedMotion ? 0 : 0,
    animationDuration: prefersReducedMotion ? 0 : 800,
    animationEasing: 'ease-out'
  }), [prefersReducedMotion]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 contain-layout">
      {/* Activity Chart */}
      <Card className="contain-paint">
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={weeklyActivityData}>
              <defs>
                <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBuilds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="commits"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorCommits)"
                strokeWidth={2}
                {...chartAnimation}
              />
              <Area
                type="monotone"
                dataKey="builds"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorBuilds)"
                strokeWidth={2}
                {...chartAnimation}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Storage Chart */}
      <Card className="contain-paint">
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={storageData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                {...chartAnimation}
              >
                {storageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
});

export default DashboardCharts;
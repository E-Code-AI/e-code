import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface ErrorRateChartProps {
  data?: any[];
  realTime?: any;
  detailed?: boolean;
}

function readNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ErrorRateChart({ data, realTime, detailed }: ErrorRateChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    const grouped: Record<string, any> = {};
    
    data.forEach((item: any) => {
      if (item.metric_name === 'error_rate') {
        const time = new Date(item.timestamp).toLocaleTimeString();
        if (!grouped[time]) {
          grouped[time] = {
            time,
            error4xx: 0,
            error5xx: 0,
            total: 0
          };
        }
        
        const errorRate = parseFloat(item.metric_value);
        grouped[time].total = errorRate;
        grouped[time].error4xx = readNumber(item.error4xx ?? item.error_4xx ?? item.client_error_rate) ?? 0;
        grouped[time].error5xx = readNumber(item.error5xx ?? item.error_5xx ?? item.server_error_rate) ?? 0;
      }
    });
    
    return Object.values(grouped).slice(-50);
  }, [data]);

  const currentErrorRate = realTime?.application?.errorRate || 0;
  const isHighErrorRate = currentErrorRate > 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Error Rate
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{currentErrorRate.toFixed(2)}%</span>
            {isHighErrorRate && (
              <Badge variant="destructive" className="animate-pulse">High</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={detailed ? 400 : 300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="time" 
              className="text-[11px]"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis 
              className="text-[11px]"
              tick={{ fill: 'currentColor' }}
              label={{ value: 'Error Rate (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: any) => `${value?.toFixed(2)}%`}
            />
            <Legend />
            {detailed ? (
              <>
                <Bar dataKey="error4xx" stackId="a" fill="#F59E0B" name="4xx Errors" />
                <Bar dataKey="error5xx" stackId="a" fill="#EF4444" name="5xx Errors" />
              </>
            ) : (
              <Bar dataKey="total" fill="#EF4444" name="Error Rate" />
            )}
          </BarChart>
        </ResponsiveContainer>
        
        {detailed && currentErrorRate > 0 && realTime?.application?.recentErrors && (
          <div className="mt-4 space-y-2">
            <p className="text-[13px] font-semibold">Recent Errors</p>
            <div className="space-y-1">
              {realTime.application.recentErrors.map((error: any) => (
                <div key={`${error.statusCode}-${error.message}`} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{error.statusCode} {error.message}</span>
                  <span>{readNumber(error.rate ?? error.percentage)?.toFixed(2) ?? '0.00'}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

export function AuthenticationDemo() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [isLogging, setIsLogging] = useState(false);
  const [testResults, setTestResults] = useState<any>({});
  const { toast } = useToast();

  // Check current user status
  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: ['/api/user'],
    retry: false
  });

  const handleLogin = async () => {
    setIsLogging(true);
    try {
      const response = await apiRequest('POST', '/api/login', { username, password });
      const userData = await response.json();
      
      toast({
        title: "✅ Login Successful",
        description: `Welcome back, ${userData.username}!`
      });
      
      // Refetch user data to update UI
      await refetchUser();
      
    } catch (error: any) {
      toast({
        title: "❌ Login Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLogging(false);
    }
  };

  const testBackendFeatures = async () => {
    const results: any = {};
    
    try {
      // Test 1: File Operations
      const fileResponse = await apiRequest('POST', '/api/projects/1/files', {
        path: 'test.js',
        content: 'console.log("Backend test successful!");'
      });
      results.fileOperations = fileResponse.ok ? '✅ Working' : '❌ Failed';

      // Test 2: AI Code Generation  
      const aiResponse = await apiRequest('POST', '/api/openai/generate', {
        prompt: 'Create a simple React component',
        language: 'javascript'
      });
      results.aiGeneration = aiResponse.ok ? '✅ Working' : '❌ Failed';

      // Test 3: Live Preview
      const previewResponse = await apiRequest('POST', '/api/preview/start', {
        projectId: 1
      });
      results.livePreview = previewResponse.ok ? '✅ Working' : '❌ Failed';

      // Test 4: Container Orchestration
      const containerResponse = await apiRequest('POST', '/api/containers', {
        projectId: 1,
        image: 'node:18',
        command: 'node --version'
      });
      results.containerOrchestration = containerResponse.ok ? '✅ Working' : '❌ Failed';

      // Test Polyglot Services
      const healthResponse = await apiRequest('GET', '/api/health');
      const healthData = await healthResponse.json();
      results.polyglotServices = {
        typescript: healthData.services?.typescript === 'healthy' ? '✅ Healthy' : '❌ Unhealthy',
        golang: healthData.services?.golang === 'healthy' ? '✅ Healthy' : '❌ Unhealthy', 
        python: healthData.services?.python === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'
      };

    } catch (error: any) {
      results.error = error.message;
    }

    setTestResults(results);
    
    toast({
      title: "🧪 Backend Tests Complete",
      description: "Check results below"
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔐 Authentication System</CardTitle>
          <CardDescription>
            Demonstrating real login functionality with session management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser ? (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✅ AUTHENTICATED
                </Badge>
              </div>
              <p><strong>User:</strong> {currentUser.username}</p>
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Display Name:</strong> {currentUser.displayName}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Input 
                  placeholder="Username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Input 
                  type="password" 
                  placeholder="Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button onClick={handleLogin} disabled={isLogging}>
                  {isLogging ? 'Logging in...' : 'Login'}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Use credentials: admin / admin
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🚀 Backend Feature Tests</CardTitle>
          <CardDescription>
            Test all 4 critical backend features with real API calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testBackendFeatures} className="w-full">
            🧪 Run Complete Backend Tests
          </Button>
          
          {Object.keys(testResults).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📁 File Operations</h4>
                <Badge variant="outline">{testResults.fileOperations || '⏳ Pending'}</Badge>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🤖 AI Code Generation</h4>
                <Badge variant="outline">{testResults.aiGeneration || '⏳ Pending'}</Badge>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">👁️ Live Preview System</h4>
                <Badge variant="outline">{testResults.livePreview || '⏳ Pending'}</Badge>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🐳 Container Orchestration</h4>
                <Badge variant="outline">{testResults.containerOrchestration || '⏳ Pending'}</Badge>
              </div>

              {testResults.polyglotServices && (
                <div className="p-4 border rounded-lg md:col-span-2">
                  <h4 className="font-semibold mb-2">🔧 Polyglot Services</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline">TypeScript: {testResults.polyglotServices.typescript}</Badge>
                    <Badge variant="outline">Go: {testResults.polyglotServices.golang}</Badge>
                    <Badge variant="outline">Python: {testResults.polyglotServices.python}</Badge>
                  </div>
                </div>
              )}

              {testResults.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg md:col-span-2">
                  <p className="text-red-800">{testResults.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
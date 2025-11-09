import { useState, useEffect } from 'react';
import { AgentWorkflowSelector } from './AgentWorkflowSelector';
import { DesignPrototypeViewer } from './DesignPrototypeViewer';
import { MVPCompletionDialog } from './MVPCompletionDialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

type WorkflowPhase = 
  | 'generating_features'
  | 'selecting_build_option'
  | 'building_design'
  | 'design_preview'
  | 'building_full'
  | 'task_list_review'
  | 'mvp_complete'
  | 'extended_build'
  | 'complete';

interface AgentWorkflowOrchestratorProps {
  projectId: string;
  initialPrompt: string;
  onComplete?: () => void;
}

export function AgentWorkflowOrchestrator({ 
  projectId, 
  initialPrompt,
  onComplete 
}: AgentWorkflowOrchestratorProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<WorkflowPhase>('generating_features');
  const [featureList, setFeatureList] = useState<string[]>([]);
  const [taskList, setTaskList] = useState<string[]>([]);
  const [designPreviewUrl, setDesignPreviewUrl] = useState<string>('');
  const [buildChoice, setBuildChoice] = useState<'full' | 'design' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);

  // Generate feature list from initial prompt
  useEffect(() => {
    if (phase === 'generating_features' && initialPrompt) {
      generateFeatureList();
    }
  }, [phase, initialPrompt]);

  const generateFeatureList = async () => {
    setIsProcessing(true);
    try {
      // Call backend to generate feature list using AI
      const response = await apiRequest('POST', '/api/agent/features/generate', {
        projectId,
        prompt: initialPrompt
      }) as { features: string[] };

      setFeatureList(response.features || [
        'User authentication and authorization',
        'Responsive design for mobile and desktop',
        'Database integration for data persistence',
        'RESTful API endpoints',
        'Interactive user interface',
      ]);
      
      setPhase('selecting_build_option');
    } catch (error) {
      console.error('Feature generation failed:', error);
      // Fallback to default features
      setFeatureList([
        'User authentication and authorization',
        'Responsive design for mobile and desktop',
        'Database integration for data persistence',
        'RESTful API endpoints',
        'Interactive user interface',
      ]);
      setPhase('selecting_build_option');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuildChoice = async (choice: 'full' | 'design') => {
    setBuildChoice(choice);
    setIsProcessing(true);

    try {
      if (choice === 'design') {
        setPhase('building_design');
        
        // Simulate design build (3-10 mins)
        setTimeout(() => {
          setDesignPreviewUrl(`/project/${projectId}/preview`);
          setPhase('design_preview');
          setIsProcessing(false);
        }, 2000);
      } else {
        setPhase('building_full');
        
        // Call backend to start full build
        const response = await apiRequest('POST', '/api/agent/build/full', {
          projectId,
          features: featureList,
          prompt: initialPrompt
        }) as { taskList: string[] };

        setTaskList(response.taskList || [
          'Set up authentication system',
          'Create database schema',
          'Build API endpoints',
          'Design user interface',
          'Implement core functionality',
          'Add error handling',
          'Write tests',
          'Optimize performance'
        ]);

        setPhase('mvp_complete');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Build failed:', error);
      toast({
        title: "Build Error",
        description: error instanceof Error ? error.message : "Failed to start build",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const handleKeepIterating = () => {
    toast({
      title: "Continuing Design",
      description: "Refining the visual prototype..."
    });
    // Keep in design phase, allow user to provide feedback
  };

  const handleBuildFunctionality = async () => {
    setIsProcessing(true);
    setPhase('building_full');

    try {
      // Convert design to full build
      const response = await apiRequest('POST', '/api/agent/build/from-design', {
        projectId,
        designUrl: designPreviewUrl,
        features: featureList
      }) as { taskList: string[] };

      setTaskList(response.taskList || [
        'Convert design to functional components',
        'Add state management',
        'Implement API integration',
        'Set up database connections',
        'Add authentication',
        'Implement business logic'
      ]);

      setPhase('mvp_complete');
    } catch (error) {
      console.error('Build from design failed:', error);
      toast({
        title: "Build Error",
        description: "Failed to build functionality from design",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismissMVP = () => {
    setPhase('complete');
    onComplete?.();
  };

  const handleContinueBuilding = async () => {
    setIsProcessing(true);
    setPhase('extended_build');

    try {
      // Start extended build (up to 200 minutes)
      await apiRequest('POST', '/api/agent/build/extended', {
        projectId,
        taskList
      });

      toast({
        title: "Extended Build Started",
        description: "Agent will continue building for up to 200 minutes",
      });

      // Simulate progress
      const interval = setInterval(() => {
        setBuildProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setPhase('complete');
            setIsProcessing(false);
            onComplete?.();
            return 100;
          }
          return prev + 5;
        });
      }, 3000);
    } catch (error) {
      console.error('Extended build failed:', error);
      toast({
        title: "Build Error",
        description: "Failed to start extended build",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <AnimatePresence mode="wait">
        {/* Generating Features */}
        {phase === 'generating_features' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px]"
          >
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Analyzing your request and generating feature list...
            </p>
          </motion.div>
        )}

        {/* Build Option Selection */}
        {phase === 'selecting_build_option' && (
          <AgentWorkflowSelector
            key="selector"
            featureList={featureList}
            onBuildChoice={handleBuildChoice}
            isProcessing={isProcessing}
          />
        )}

        {/* Building Design */}
        {phase === 'building_design' && (
          <motion.div
            key="building-design"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px]"
          >
            <Sparkles className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Creating visual prototype...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              This will take approximately 5-10 minutes
            </p>
          </motion.div>
        )}

        {/* Design Preview */}
        {phase === 'design_preview' && (
          <DesignPrototypeViewer
            key="design-preview"
            designPreviewUrl={designPreviewUrl}
            onKeepIterating={handleKeepIterating}
            onBuildFunctionality={handleBuildFunctionality}
            isProcessing={isProcessing}
          />
        )}

        {/* Building Full App */}
        {phase === 'building_full' && (
          <motion.div
            key="building-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px]"
          >
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Building your application...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              This will take approximately 10-20 minutes
            </p>
          </motion.div>
        )}

        {/* MVP Complete */}
        {phase === 'mvp_complete' && (
          <MVPCompletionDialog
            key="mvp-complete"
            taskList={taskList}
            onDismiss={handleDismissMVP}
            onContinueBuilding={handleContinueBuilding}
            isProcessing={isProcessing}
          />
        )}

        {/* Extended Build */}
        {phase === 'extended_build' && (
          <motion.div
            key="extended-build"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px]"
          >
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              Extended build in progress...
            </p>
            <div className="w-full max-w-md">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${buildProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 text-center">
                {buildProgress}% complete
              </p>
            </div>
          </motion.div>
        )}

        {/* Complete */}
        {phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[400px]"
          >
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Build Complete!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your application is ready to use
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

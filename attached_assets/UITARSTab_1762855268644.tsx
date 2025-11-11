import { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useToast } from './ui/use-toast';
import { projectId as supabaseProjectId, publicAnonKey } from '../utils/supabase/info';
import { 
  Upload, 
  Image as ImageIcon, 
  Wand2, 
  Code2, 
  Eye, 
  Download,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCode,
  Palette,
  Layers
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const SERVER_URL = `https://${supabaseProjectId}.supabase.co/functions/v1/server`;

interface UITARSTabProps {
  projectId: string;
  onCodeGenerated?: (code: string, files: any[]) => void;
}

interface GeneratedFile {
  path: string;
  content: string;
  type: 'component' | 'style' | 'config';
}

interface AnalysisResult {
  components: string[];
  layout: string;
  styling: string;
  interactivity: string[];
  suggestions: string[];
}

export function UITARSTab({ projectId, onCodeGenerated }: UITARSTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une image valide',
        variant: 'destructive',
      });
      return;
    }

    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    toast({
      title: 'Image chargée',
      description: 'Image prête pour l\'analyse',
    });
  }, [toast]);

  // Handle image URL
  const handleImageUrlSubmit = useCallback(() => {
    if (!imageUrl) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une URL d\'image',
        variant: 'destructive',
      });
      return;
    }

    setImagePreview(imageUrl);
    toast({
      title: 'Image chargée',
      description: 'Image prête pour l\'analyse',
    });
  }, [imageUrl, toast]);

  // Analyze design
  const analyzeDesign = useCallback(async () => {
    if (!imagePreview) {
      toast({
        title: 'Erreur',
        description: 'Veuillez charger une image d\'abord',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      // Call AI agent to analyze the design
      const response = await fetch(`${SERVER_URL}/ui-tars/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          imageUrl: imagePreview,
          prompt: prompt || 'Analyze this UI design and identify all components, layout structure, and styling patterns',
          projectId,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Analysis error response:', errorData);
        throw new Error(errorData.error || 'Échec de l\'analyse');
      }

      const result = await response.json();
      
      setAnalysis({
        components: result.components || ['Header', 'Navigation', 'Content', 'Footer'],
        layout: result.layout || 'Flexbox with responsive grid',
        styling: result.styling || 'Modern, minimalist design with Tailwind CSS',
        interactivity: result.interactivity || ['Button hover effects', 'Form validation', 'Modal dialogs'],
        suggestions: result.suggestions || ['Add loading states', 'Implement error handling', 'Add accessibility features'],
      });

      toast({
        title: 'Analyse terminée',
        description: 'Design analysé avec succès',
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Erreur d\'analyse',
        description: error.message || 'Impossible d\'analyser le design',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  }, [imagePreview, prompt, projectId, toast]);

  // Generate code
  const generateCode = useCallback(async () => {
    if (!analysis) {
      toast({
        title: 'Erreur',
        description: 'Veuillez analyser le design d\'abord',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      // Call AI agent to generate code
      const response = await fetch(`${SERVER_URL}/ui-tars/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          imageUrl: imagePreview,
          analysis,
          prompt: prompt || 'Generate a complete React + Tailwind CSS implementation',
          projectId,
          framework: 'react',
          styling: 'tailwind',
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Generation error response:', errorData);
        throw new Error(errorData.error || 'Échec de la génération');
      }

      const result = await response.json();
      
      const files: GeneratedFile[] = result.files || [
        {
          path: 'src/components/GeneratedComponent.tsx',
          content: `import React from 'react';\n\nexport function GeneratedComponent() {\n  return (\n    <div className="container mx-auto p-4">\n      {/* Generated from UI-TARS */}\n      <h1 className="text-3xl font-bold">Generated Component</h1>\n    </div>\n  );\n}`,
          type: 'component' as const,
        },
        {
          path: 'src/styles/generated.css',
          content: `/* Generated styles from UI-TARS */\n.generated-container {\n  @apply container mx-auto p-4;\n}`,
          type: 'style' as const,
        },
      ];

      setGeneratedFiles(files);
      setSelectedFile(files[0]);

      // Notify parent component
      if (onCodeGenerated) {
        onCodeGenerated(files[0].content, files);
      }

      toast({
        title: 'Code généré',
        description: `${files.length} fichier(s) créé(s)`,
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: 'Erreur de génération',
        description: error.message || 'Impossible de générer le code',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [analysis, imagePreview, prompt, projectId, onCodeGenerated, toast]);

  // Insert code into project
  const insertCodeIntoProject = useCallback(async () => {
    if (generatedFiles.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Aucun code généré',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Save files to project
      for (const file of generatedFiles) {
        await fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: file.path,
            content: file.content,
          }),
        });
      }

      toast({
        title: 'Code inséré',
        description: `${generatedFiles.length} fichier(s) ajouté(s) au projet`,
      });
    } catch (error) {
      console.error('Insert error:', error);
      toast({
        title: 'Erreur d\'insertion',
        description: 'Impossible d\'insérer le code',
        variant: 'destructive',
      });
    }
  }, [generatedFiles, projectId, toast]);

  return (
    <div className="flex h-full">
      {/* Left Panel - Input */}
      <div className="w-1/2 border-r p-6 overflow-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Wand2 className="w-6 h-6" />
              UI-TARS Design → Code
            </h2>
            <p className="text-muted-foreground mt-2">
              Transformez n'importe quel design en code React + Tailwind CSS
            </p>
          </div>

          <Separator />

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir une image
                </Button>
                {uploadedImage && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {uploadedImage.name}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL de l'image</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/design.png"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <Button onClick={handleImageUrlSubmit}>
                    Charger
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {imagePreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Aperçu</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageWithFallback
                  src={imagePreview}
                  alt="Design preview"
                  className="w-full rounded-lg border"
                />
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="prompt">Instructions (Optionnel)</Label>
            <Textarea
              id="prompt"
              placeholder="Ex: Créer une landing page moderne avec un header, une section hero, et un footer..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={analyzeDesign}
              disabled={!imagePreview || isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Analyser
                </>
              )}
            </Button>

            <Button
              onClick={generateCode}
              disabled={!analysis || isGenerating}
              variant="default"
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Code2 className="w-4 h-4 mr-2" />
                  Générer le Code
                </>
              )}
            </Button>
          </div>

          {(isAnalyzing || isGenerating) && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progress}%
              </p>
            </div>
          )}

          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Analyse du Design
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Composants détectés
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.components.map((comp, idx) => (
                      <Badge key={idx} variant="secondary">
                        {comp}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Layout</h4>
                  <p className="text-sm text-muted-foreground">{analysis.layout}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Style
                  </h4>
                  <p className="text-sm text-muted-foreground">{analysis.styling}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Interactivité</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {analysis.interactivity.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Right Panel - Output */}
      <div className="w-1/2 p-6 overflow-auto">
        {generatedFiles.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Code Généré
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateCode()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Régénérer
                </Button>
                <Button
                  size="sm"
                  onClick={insertCodeIntoProject}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Insérer dans le projet
                </Button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {generatedFiles.map((file, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={selectedFile?.path === file.path ? 'default' : 'outline'}
                  onClick={() => setSelectedFile(file)}
                >
                  {file.path.split('/').pop()}
                </Button>
              ))}
            </div>

            {selectedFile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-mono">
                    {selectedFile.path}
                  </CardTitle>
                  <CardDescription>
                    Type: {selectedFile.type}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                      <code>{selectedFile.content}</code>
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Code2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Aucun code généré</h3>
                <p className="text-sm text-muted-foreground">
                  Chargez un design et cliquez sur "Générer le Code"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
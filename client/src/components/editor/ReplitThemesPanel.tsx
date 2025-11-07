import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Save,
  Download,
  Upload,
  Sparkles,
  Eye,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    accent: string;
    muted: string;
    border: string;
  };
  isPro?: boolean;
  isCustom?: boolean;
}

export function ReplitThemesPanel({ projectId }: { projectId?: string }) {
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [customColors, setCustomColors] = useState({
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    background: '#ffffff',
    foreground: '#1f2937',
    accent: '#f59e0b',
    muted: '#6b7280',
    border: '#e5e7eb'
  });

  const [fontSize, setFontSize] = useState([14]);
  const [borderRadius, setBorderRadius] = useState([4]);

  const themePresets: ThemePreset[] = [
    {
      id: 'light',
      name: 'Light',
      description: 'Clean and bright theme',
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        background: '#ffffff',
        foreground: '#1f2937',
        accent: '#f59e0b',
        muted: '#6b7280',
        border: '#e5e7eb'
      }
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes',
      colors: {
        primary: '#60a5fa',
        secondary: '#a78bfa',
        background: '#1e1e1e',
        foreground: '#f3f4f6',
        accent: '#fbbf24',
        muted: '#9ca3af',
        border: '#374151'
      }
    },
    {
      id: 'midnight',
      name: 'Midnight',
      description: 'Deep blue dark theme',
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        background: '#0f172a',
        foreground: '#e2e8f0',
        accent: '#38bdf8',
        muted: '#94a3b8',
        border: '#1e293b'
      },
      isPro: true
    },
    {
      id: 'forest',
      name: 'Forest',
      description: 'Natural green tones',
      colors: {
        primary: '#10b981',
        secondary: '#059669',
        background: '#f0fdf4',
        foreground: '#14532d',
        accent: '#84cc16',
        muted: '#4ade80',
        border: '#bbf7d0'
      },
      isPro: true
    },
    {
      id: 'sunset',
      name: 'Sunset',
      description: 'Warm and vibrant',
      colors: {
        primary: '#f97316',
        secondary: '#dc2626',
        background: '#fef3c7',
        foreground: '#7c2d12',
        accent: '#fbbf24',
        muted: '#fb923c',
        border: '#fed7aa'
      }
    }
  ];

  const handleColorChange = (colorKey: string, value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
  };

  const handleSaveCustomTheme = () => {
    console.log('Saving custom theme:', customColors);
  };

  const handleExportTheme = () => {
    const themeData = {
      name: 'Custom Theme',
      colors: customColors,
      fontSize: fontSize[0],
      borderRadius: borderRadius[0]
    };
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme.json';
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Themes</h3>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded">
          <button
            className={cn(
              "flex-1 px-3 py-1.5 text-sm rounded transition-colors",
              "flex items-center justify-center gap-2",
              selectedTheme === 'light' && "bg-white shadow-sm"
            )}
            onClick={() => setSelectedTheme('light')}
          >
            <Sun className="h-3 w-3" />
            Light
          </button>
          <button
            className={cn(
              "flex-1 px-3 py-1.5 text-sm rounded transition-colors",
              "flex items-center justify-center gap-2",
              selectedTheme === 'dark' && "bg-white shadow-sm"
            )}
            onClick={() => setSelectedTheme('dark')}
          >
            <Moon className="h-3 w-3" />
            Dark
          </button>
          <button
            className={cn(
              "flex-1 px-3 py-1.5 text-sm rounded transition-colors",
              "flex items-center justify-center gap-2",
              selectedTheme === 'system' && "bg-white shadow-sm"
            )}
            onClick={() => setSelectedTheme('system')}
          >
            <Monitor className="h-3 w-3" />
            System
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="presets" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 px-4 pt-2">
          <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
          <TabsTrigger value="customize" className="text-xs">Customize</TabsTrigger>
          <TabsTrigger value="editor" className="text-xs">Editor</TabsTrigger>
        </TabsList>

        {/* Presets Tab */}
        <TabsContent value="presets" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="grid gap-3">
                {themePresets.map((theme) => (
                  <div
                    key={theme.id}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all",
                      selectedTheme === theme.id 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    onClick={() => !theme.isPro && setSelectedTheme(theme.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{theme.name}</h4>
                          {theme.isPro && (
                            <Badge className="text-xs px-1.5 py-0">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Pro
                            </Badge>
                          )}
                          {theme.isCustom && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              Custom
                            </Badge>
                          )}
                          {selectedTheme === theme.id && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{theme.description}</p>
                      </div>
                    </div>

                    {/* Color Preview */}
                    <div className="flex gap-2 mt-3">
                      {Object.entries(theme.colors).slice(0, 5).map(([key, color]) => (
                        <div
                          key={key}
                          className="flex-1 h-8 rounded border border-gray-200"
                          style={{ backgroundColor: color }}
                          title={key}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Customize Tab */}
        <TabsContent value="customize" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Color Customization */}
              {Object.entries(customColors).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: value }}
                      />
                      <span className="text-xs font-mono text-gray-600">{value}</span>
                    </div>
                  </div>
                  <Input
                    id={key}
                    type="color"
                    value={value}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="h-8"
                  />
                </div>
              ))}

              {/* Typography */}
              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Font Size</Label>
                      <span className="text-xs text-gray-600">{fontSize[0]}px</span>
                    </div>
                    <Slider
                      value={fontSize}
                      onValueChange={setFontSize}
                      min={12}
                      max={20}
                      step={1}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Border Radius</Label>
                      <span className="text-xs text-gray-600">{borderRadius[0]}px</span>
                    </div>
                    <Slider
                      value={borderRadius}
                      onValueChange={setBorderRadius}
                      min={0}
                      max={12}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleSaveCustomTheme}>
                  <Save className="h-3 w-3 mr-1" />
                  Save Theme
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportTheme}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Editor Tab */}
        <TabsContent value="editor" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h4 className="text-sm font-medium mb-3">Editor Themes</h4>
              
              <div className="space-y-2">
                {['VS Code', 'Monokai', 'GitHub', 'Solarized', 'Dracula', 'Nord'].map((theme) => (
                  <button
                    key={theme}
                    className="w-full p-3 text-left border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{theme}</span>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Live Preview */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Preview</h4>
                <div className="p-4 bg-gray-900 rounded text-white font-mono text-xs">
                  <div className="text-blue-400">// Sample code preview</div>
                  <div>
                    <span className="text-purple-400">function</span>{' '}
                    <span className="text-yellow-300">hello</span>
                    <span className="text-gray-400">(</span>
                    <span className="text-orange-400">name</span>
                    <span className="text-gray-400">)</span>{' '}
                    <span className="text-gray-400">{'{'}</span>
                  </div>
                  <div className="ml-4">
                    <span className="text-purple-400">return</span>{' '}
                    <span className="text-green-400">`Hello, ${'{'}name{'}'}`</span>
                    <span className="text-gray-400">;</span>
                  </div>
                  <div className="text-gray-400">{'}'}</div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
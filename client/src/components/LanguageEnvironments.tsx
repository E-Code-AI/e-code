/**
 * Language Environments component
 * Displays available language environments and their status
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Language, languageConfigs } from '@/lib/languages';
import { Loader2 } from 'lucide-react';

// Importing language icons
import { SiPython, SiNodedotjs, SiJavascript, SiTypescript, SiJava, SiGo, 
  SiRuby, SiRust, SiPhp, SiC, SiCplusplus, SiCsharp, SiSwift, 
  SiKotlin, SiDart, SiBash, SiHtml5, SiNixos, SiDeno } from 'react-icons/si';

// Map of language icons
const languageIcons: Record<string, React.ReactNode> = {
  nodejs: <SiNodedotjs className="h-6 w-6 text-green-600" />,
  typescript: <SiTypescript className="h-6 w-6 text-blue-600" />,
  python: <SiPython className="h-6 w-6 text-blue-500" />,
  java: <SiJava className="h-6 w-6 text-red-600" />,
  go: <SiGo className="h-6 w-6 text-blue-400" />,
  ruby: <SiRuby className="h-6 w-6 text-red-500" />,
  rust: <SiRust className="h-6 w-6 text-orange-700" />,
  php: <SiPhp className="h-6 w-6 text-indigo-600" />,
  c: <SiC className="h-6 w-6 text-blue-800" />,
  cpp: <SiCplusplus className="h-6 w-6 text-blue-700" />,
  csharp: <SiCsharp className="h-6 w-6 text-purple-600" />,
  swift: <SiSwift className="h-6 w-6 text-orange-500" />,
  kotlin: <SiKotlin className="h-6 w-6 text-purple-500" />,
  dart: <SiDart className="h-6 w-6 text-blue-500" />,
  bash: <SiBash className="h-6 w-6 text-gray-800" />,
  'html-css-js': <SiHtml5 className="h-6 w-6 text-orange-600" />,
  nix: <SiNixos className="h-6 w-6 text-blue-500" />,
  deno: <SiDeno className="h-6 w-6 text-black" />
};

interface LanguageEnvironmentsProps {
  onSelectLanguage?: (language: Language) => void;
  selectedLanguage?: Language;
}

export function LanguageEnvironments({ onSelectLanguage, selectedLanguage }: LanguageEnvironmentsProps) {
  const { data: dependencies, isLoading } = useQuery({
    queryKey: ['/api/runtime/dependencies'],
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const dockerAvailable = dependencies?.docker || false;
  const nixAvailable = dependencies?.nix || false;

  // Filter and sort languages
  const sortedLanguages = Object.entries(languageConfigs)
    .sort(([, configA], [, configB]) => configA.displayName.localeCompare(configB.displayName))
    .map(([key, config]) => ({ key: key as Language, config }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl">Language Environments</CardTitle>
        <CardDescription>
          Available programming language runtimes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedLanguages.map(({ key, config }) => (
                <TooltipProvider key={key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card 
                        className={`flex flex-col cursor-pointer hover:border-primary/50 transition-colors
                          ${selectedLanguage === key ? 'border-primary ring-1 ring-primary' : ''}`}
                        onClick={() => onSelectLanguage?.(key)}
                      >
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {languageIcons[key] || <div className="h-6 w-6 bg-gray-200 rounded-full" />}
                              <CardTitle className="text-base">{config.displayName}</CardTitle>
                            </div>
                            <div className="flex gap-1">
                              {nixAvailable && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Nix
                                </Badge>
                              )}
                              {dockerAvailable && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Docker
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardFooter className="pt-0 pb-3 text-xs text-muted-foreground">
                          {config.fileExtensions.join(', ')}
                        </CardFooter>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p><strong>Run command:</strong> {config.runCommand}</p>
                      {config.installCommand && (
                        <p><strong>Install:</strong> {config.installCommand}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
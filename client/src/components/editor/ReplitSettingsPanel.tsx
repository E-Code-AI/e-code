import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Code,
  Palette,
  Keyboard,
  Globe,
  Shield,
  Bell,
  User,
  Save,
  RotateCcw,
  ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ElementType;
}

export function ReplitSettingsPanel({ projectId }: { projectId?: string }) {
  const [activeSection, setActiveSection] = useState('editor');
  const [isDirty, setIsDirty] = useState(false);

  // Editor settings
  const [fontSize, setFontSize] = useState('14');
  const [tabSize, setTabSize] = useState('2');
  const [wordWrap, setWordWrap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [minimap, setMinimap] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [formatOnSave, setFormatOnSave] = useState(true);

  // Theme settings
  const [theme, setTheme] = useState('light');
  const [editorTheme, setEditorTheme] = useState('vs-light');

  // Project settings
  const [projectName, setProjectName] = useState('My Project');
  const [projectDescription, setProjectDescription] = useState('A Replit project');
  const [projectPrivacy, setProjectPrivacy] = useState('public');

  const sections: SettingSection[] = [
    { id: 'editor', title: 'Editor', icon: Code },
    { id: 'theme', title: 'Appearance', icon: Palette },
    { id: 'keyboard', title: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'environment', title: 'Environment', icon: Globe },
    { id: 'project', title: 'Project', icon: Shield },
    { id: 'notifications', title: 'Notifications', icon: Bell },
    { id: 'account', title: 'Account', icon: User }
  ];

  const handleSave = () => {
    console.log('Saving settings...');
    setIsDirty(false);
  };

  const handleReset = () => {
    console.log('Resetting settings...');
    setIsDirty(false);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'editor':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Editor Preferences</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fontSize" className="text-xs">Font Size</Label>
                    <Select value={fontSize} onValueChange={(v) => { setFontSize(v); setIsDirty(true); }}>
                      <SelectTrigger id="fontSize" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12px</SelectItem>
                        <SelectItem value="14">14px</SelectItem>
                        <SelectItem value="16">16px</SelectItem>
                        <SelectItem value="18">18px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tabSize" className="text-xs">Tab Size</Label>
                    <Select value={tabSize} onValueChange={(v) => { setTabSize(v); setIsDirty(true); }}>
                      <SelectTrigger id="tabSize" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 spaces</SelectItem>
                        <SelectItem value="4">4 spaces</SelectItem>
                        <SelectItem value="8">8 spaces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="wordWrap" className="text-sm cursor-pointer">Word Wrap</Label>
                    <Switch
                      id="wordWrap"
                      checked={wordWrap}
                      onCheckedChange={(v) => { setWordWrap(v); setIsDirty(true); }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="lineNumbers" className="text-sm cursor-pointer">Line Numbers</Label>
                    <Switch
                      id="lineNumbers"
                      checked={lineNumbers}
                      onCheckedChange={(v) => { setLineNumbers(v); setIsDirty(true); }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="minimap" className="text-sm cursor-pointer">Minimap</Label>
                    <Switch
                      id="minimap"
                      checked={minimap}
                      onCheckedChange={(v) => { setMinimap(v); setIsDirty(true); }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoSave" className="text-sm cursor-pointer">Auto Save</Label>
                    <Switch
                      id="autoSave"
                      checked={autoSave}
                      onCheckedChange={(v) => { setAutoSave(v); setIsDirty(true); }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="formatOnSave" className="text-sm cursor-pointer">Format on Save</Label>
                    <Switch
                      id="formatOnSave"
                      checked={formatOnSave}
                      onCheckedChange={(v) => { setFormatOnSave(v); setIsDirty(true); }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Appearance Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme" className="text-xs">Application Theme</Label>
                  <Select value={theme} onValueChange={(v) => { setTheme(v); setIsDirty(true); }}>
                    <SelectTrigger id="theme" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editorTheme" className="text-xs">Editor Theme</Label>
                  <Select value={editorTheme} onValueChange={(v) => { setEditorTheme(v); setIsDirty(true); }}>
                    <SelectTrigger id="editorTheme" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vs-light">VS Light</SelectItem>
                      <SelectItem value="vs-dark">VS Dark</SelectItem>
                      <SelectItem value="monokai">Monokai</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="solarized">Solarized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'keyboard':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium mb-3">Keyboard Shortcuts</h3>
            
            <div className="space-y-2">
              {[
                { action: 'Save', keys: 'Cmd+S' },
                { action: 'Open File', keys: 'Cmd+O' },
                { action: 'Command Palette', keys: 'Cmd+Shift+P' },
                { action: 'Find', keys: 'Cmd+F' },
                { action: 'Replace', keys: 'Cmd+H' },
                { action: 'Toggle Terminal', keys: 'Cmd+`' },
                { action: 'New File', keys: 'Cmd+N' },
                { action: 'Close Tab', keys: 'Cmd+W' }
              ].map((shortcut) => (
                <div key={shortcut.action} className="flex items-center justify-between py-2 px-3 hover:bg-muted rounded">
                  <span className="text-sm text-foreground">{shortcut.action}</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded border border-border">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="w-full">
              Customize Shortcuts
            </Button>
          </div>
        );

      case 'environment':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Environment Variables</h3>
              
              <div className="space-y-3">
                {[
                  { key: 'NODE_ENV', value: 'development' },
                  { key: 'PORT', value: '3000' },
                  { key: 'API_URL', value: 'https://api.example.com' }
                ].map((env, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={env.key}
                      placeholder="Key"
                      className="flex-1 text-sm"
                      onChange={() => setIsDirty(true)}
                    />
                    <Input
                      value={env.value}
                      placeholder="Value"
                      className="flex-1 text-sm"
                      onChange={() => setIsDirty(true)}
                    />
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" className="w-full mt-3">
                Add Variable
              </Button>
            </div>
          </div>
        );

      case 'project':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Project Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectName" className="text-xs">Project Name</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => { setProjectName(e.target.value); setIsDirty(true); }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="projectDescription" className="text-xs">Description</Label>
                  <Input
                    id="projectDescription"
                    value={projectDescription}
                    onChange={(e) => { setProjectDescription(e.target.value); setIsDirty(true); }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="privacy" className="text-xs">Privacy</Label>
                  <Select value={projectPrivacy} onValueChange={(v) => { setProjectPrivacy(v); setIsDirty(true); }}>
                    <SelectTrigger id="privacy" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Settings className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Section coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Settings</h3>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-48 border-r border-border">
          <ScrollArea className="h-full">
            <div className="p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors",
                      activeSection === section.id
                        ? "bg-status-info/10 text-status-info"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{section.title}</span>
                    <ChevronRight className="h-3 w-3 opacity-50" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-6">
              {renderSectionContent()}
            </div>
          </ScrollArea>

          {/* Footer */}
          {isDirty && (
            <div className="border-t border-border p-4 bg-muted">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">You have unsaved changes</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-3 w-3 mr-1" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
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

function SettingsSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="h-10 rounded-lg bg-[#242b3d]"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

export function ReplitSettingsPanel({ projectId }: { projectId?: string }) {
  const [activeSection, setActiveSection] = useState('editor');
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [fontSize, setFontSize] = useState('14');
  const [tabSize, setTabSize] = useState('2');
  const [wordWrap, setWordWrap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [minimap, setMinimap] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [formatOnSave, setFormatOnSave] = useState(true);

  const [theme, setTheme] = useState('light');
  const [editorTheme, setEditorTheme] = useState('vs-light');

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
    setIsDirty(false);
  };

  const handleReset = () => {
    setIsDirty(false);
  };

  const renderSectionContent = () => {
    if (isLoading) {
      return <SettingsSkeleton />;
    }

    switch (activeSection) {
      case 'editor':
        return (
          <div className="space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#5c6670]">Editor Preferences</span>
              
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="fontSize" className="text-[13px] text-[#9da2a6]">Font Size</Label>
                    <Select value={fontSize} onValueChange={(v) => { setFontSize(v); setIsDirty(true); }}>
                      <SelectTrigger id="fontSize" className="mt-1 h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1c2333] border-[#3d4452]">
                        <SelectItem value="12" className="text-[15px] text-[#ffffff]">12px</SelectItem>
                        <SelectItem value="14" className="text-[15px] text-[#ffffff]">14px</SelectItem>
                        <SelectItem value="16" className="text-[15px] text-[#ffffff]">16px</SelectItem>
                        <SelectItem value="18" className="text-[15px] text-[#ffffff]">18px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tabSize" className="text-[13px] text-[#9da2a6]">Tab Size</Label>
                    <Select value={tabSize} onValueChange={(v) => { setTabSize(v); setIsDirty(true); }}>
                      <SelectTrigger id="tabSize" className="mt-1 h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1c2333] border-[#3d4452]">
                        <SelectItem value="2" className="text-[15px] text-[#ffffff]">2 spaces</SelectItem>
                        <SelectItem value="4" className="text-[15px] text-[#ffffff]">4 spaces</SelectItem>
                        <SelectItem value="8" className="text-[15px] text-[#ffffff]">8 spaces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between h-8 px-3 rounded-lg bg-[#242b3d]">
                    <Label htmlFor="wordWrap" className="text-[15px] leading-[20px] text-[#ffffff] cursor-pointer">Word Wrap</Label>
                    <Switch
                      id="wordWrap"
                      checked={wordWrap}
                      onCheckedChange={(v) => { setWordWrap(v); setIsDirty(true); }}
                      className="data-[state=checked]:bg-[#0079f2]"
                    />
                  </div>

                  <div className="flex items-center justify-between h-8 px-3 rounded-lg bg-[#242b3d]">
                    <Label htmlFor="lineNumbers" className="text-[15px] leading-[20px] text-[#ffffff] cursor-pointer">Line Numbers</Label>
                    <Switch
                      id="lineNumbers"
                      checked={lineNumbers}
                      onCheckedChange={(v) => { setLineNumbers(v); setIsDirty(true); }}
                      className="data-[state=checked]:bg-[#0079f2]"
                    />
                  </div>

                  <div className="flex items-center justify-between h-8 px-3 rounded-lg bg-[#242b3d]">
                    <Label htmlFor="minimap" className="text-[15px] leading-[20px] text-[#ffffff] cursor-pointer">Minimap</Label>
                    <Switch
                      id="minimap"
                      checked={minimap}
                      onCheckedChange={(v) => { setMinimap(v); setIsDirty(true); }}
                      className="data-[state=checked]:bg-[#0079f2]"
                    />
                  </div>

                  <div className="flex items-center justify-between h-8 px-3 rounded-lg bg-[#242b3d]">
                    <Label htmlFor="autoSave" className="text-[15px] leading-[20px] text-[#ffffff] cursor-pointer">Auto Save</Label>
                    <Switch
                      id="autoSave"
                      checked={autoSave}
                      onCheckedChange={(v) => { setAutoSave(v); setIsDirty(true); }}
                      className="data-[state=checked]:bg-[#0079f2]"
                    />
                  </div>

                  <div className="flex items-center justify-between h-8 px-3 rounded-lg bg-[#242b3d]">
                    <Label htmlFor="formatOnSave" className="text-[15px] leading-[20px] text-[#ffffff] cursor-pointer">Format on Save</Label>
                    <Switch
                      id="formatOnSave"
                      checked={formatOnSave}
                      onCheckedChange={(v) => { setFormatOnSave(v); setIsDirty(true); }}
                      className="data-[state=checked]:bg-[#0079f2]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#5c6670]">Appearance Settings</span>
              
              <div className="space-y-3 mt-3">
                <div>
                  <Label htmlFor="theme" className="text-[13px] text-[#9da2a6]">Application Theme</Label>
                  <Select value={theme} onValueChange={(v) => { setTheme(v); setIsDirty(true); }}>
                    <SelectTrigger id="theme" className="mt-1 h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1c2333] border-[#3d4452]">
                      <SelectItem value="light" className="text-[15px] text-[#ffffff]">Light</SelectItem>
                      <SelectItem value="dark" className="text-[15px] text-[#ffffff]">Dark</SelectItem>
                      <SelectItem value="system" className="text-[15px] text-[#ffffff]">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editorTheme" className="text-[13px] text-[#9da2a6]">Editor Theme</Label>
                  <Select value={editorTheme} onValueChange={(v) => { setEditorTheme(v); setIsDirty(true); }}>
                    <SelectTrigger id="editorTheme" className="mt-1 h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1c2333] border-[#3d4452]">
                      <SelectItem value="vs-light" className="text-[15px] text-[#ffffff]">VS Light</SelectItem>
                      <SelectItem value="vs-dark" className="text-[15px] text-[#ffffff]">VS Dark</SelectItem>
                      <SelectItem value="monokai" className="text-[15px] text-[#ffffff]">Monokai</SelectItem>
                      <SelectItem value="github" className="text-[15px] text-[#ffffff]">GitHub</SelectItem>
                      <SelectItem value="solarized" className="text-[15px] text-[#ffffff]">Solarized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'keyboard':
        return (
          <div className="space-y-3">
            <span className="text-[11px] uppercase tracking-wider text-[#5c6670]">Keyboard Shortcuts</span>
            
            <div className="space-y-2 mt-3">
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
                <div key={shortcut.action} className="flex items-center justify-between h-8 px-3 rounded-lg bg-[#242b3d] hover:bg-[#3d4452] transition-colors">
                  <span className="text-[15px] leading-[20px] text-[#ffffff]">{shortcut.action}</span>
                  <kbd className="px-2 py-0.5 text-[13px] bg-[#1c2333] text-[#9da2a6] rounded-lg border border-[#3d4452]">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff] hover:bg-[#242b3d]">
              Customize Shortcuts
            </Button>
          </div>
        );

      case 'environment':
        return (
          <div className="space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#5c6670]">Environment Variables</span>
              
              <div className="space-y-3 mt-3">
                {[
                  { key: 'NODE_ENV', value: 'development' },
                  { key: 'PORT', value: '3000' },
                  { key: 'API_URL', value: 'https://api.example.com' }
                ].map((env, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={env.key}
                      placeholder="Key"
                      className="flex-1 h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff] placeholder:text-[#5c6670]"
                      onChange={() => setIsDirty(true)}
                    />
                    <Input
                      value={env.value}
                      placeholder="Value"
                      className="flex-1 h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff] placeholder:text-[#5c6670]"
                      onChange={() => setIsDirty(true)}
                    />
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full h-8 rounded-lg mt-3 bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff] hover:bg-[#242b3d]">
                Add Variable
              </Button>
            </div>
          </div>
        );

      case 'project':
        return (
          <div className="space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#5c6670]">Project Settings</span>
              
              <div className="space-y-3 mt-3">
                <div>
                  <Label htmlFor="projectName" className="text-[13px] text-[#9da2a6]">Project Name</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => { setProjectName(e.target.value); setIsDirty(true); }}
                    className="mt-1 h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff]"
                  />
                </div>

                <div>
                  <Label htmlFor="projectDescription" className="text-[13px] text-[#9da2a6]">Description</Label>
                  <Input
                    id="projectDescription"
                    value={projectDescription}
                    onChange={(e) => { setProjectDescription(e.target.value); setIsDirty(true); }}
                    className="mt-1 h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff]"
                  />
                </div>

                <div>
                  <Label htmlFor="privacy" className="text-[13px] text-[#9da2a6]">Privacy</Label>
                  <Select value={projectPrivacy} onValueChange={(v) => { setProjectPrivacy(v); setIsDirty(true); }}>
                    <SelectTrigger id="privacy" className="mt-1 h-8 rounded-lg bg-[#1c2333] border-[#3d4452] text-[15px] text-[#ffffff]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1c2333] border-[#3d4452]">
                      <SelectItem value="public" className="text-[15px] text-[#ffffff]">Public</SelectItem>
                      <SelectItem value="private" className="text-[15px] text-[#ffffff]">Private</SelectItem>
                      <SelectItem value="unlisted" className="text-[15px] text-[#ffffff]">Unlisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Settings className="w-[18px] h-[18px] text-[#5c6670] mb-3" />
            <p className="text-[15px] leading-[20px] text-[#5c6670]">Section coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0e1525]">
      <div className="min-h-[48px] flex items-center px-3 border-b border-[#3d4452]">
        <div className="flex items-center gap-2">
          <Settings className="w-[18px] h-[18px] text-[#5c6670]" />
          <h3 className="text-[17px] font-medium leading-tight text-[#ffffff]">Settings</h3>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-48 border-r border-[#3d4452]">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 h-8 rounded-lg transition-colors",
                      activeSection === section.id
                        ? "bg-[#0079f2]/15 text-[#0079f2]"
                        : "text-[#9da2a6] hover:bg-[#242b3d] hover:text-[#ffffff]"
                    )}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span className="flex-1 text-left text-[15px] leading-[20px]">{section.title}</span>
                    <ChevronRight className="w-[18px] h-[18px] opacity-50" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-3">
              {renderSectionContent()}
            </div>
          </ScrollArea>

          {isDirty && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-[#3d4452] p-3 bg-[#1c2333]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#5c6670]">You have unsaved changes</span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="h-8 rounded-lg bg-transparent border-[#3d4452] text-[15px] text-[#9da2a6] hover:bg-[#242b3d] hover:text-[#ffffff]"
                    onClick={handleReset}
                  >
                    <RotateCcw className="w-[18px] h-[18px] mr-1" />
                    Reset
                  </Button>
                  <Button 
                    className="h-8 rounded-lg bg-[#0079f2] text-[15px] text-[#ffffff] hover:bg-[#0079f2]/90"
                    onClick={handleSave}
                  >
                    <Save className="w-[18px] h-[18px] mr-1" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

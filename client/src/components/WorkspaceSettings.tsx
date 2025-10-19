import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Eye, 
  Palette, 
  Code, 
  Settings2,
  Zap,
  Bell,
  Monitor
} from 'lucide-react';

interface WorkspaceSettingsProps {
  projectId?: number;
}

export function WorkspaceSettings({ projectId }: WorkspaceSettingsProps) {
  // Agent & Assistant Settings
  const [agentAudioNotification, setAgentAudioNotification] = useState(false);
  const [agentPushNotification, setAgentPushNotification] = useState(true);
  const [assistantPushNotification, setAssistantPushNotification] = useState(true);

  // App Preview Settings
  const [automaticPreview, setAutomaticPreview] = useState(true);
  const [forwardPorts, setForwardPorts] = useState('all_ports_except_localhost');

  // Appearance Settings
  const [fontSize, setFontSize] = useState('normal');

  // Code Editing Settings
  const [aiCodeCompletion, setAiCodeCompletion] = useState(true);
  const [acceptOnCommitChar, setAcceptOnCommitChar] = useState(true);
  const [autoCloseBrackets, setAutoCloseBrackets] = useState(true);
  const [wrapping, setWrapping] = useState('soft_wrap');
  const [indentationDetection, setIndentationDetection] = useState(true);
  const [formatPastedText, setFormatPastedText] = useState(true);
  const [indentationChar, setIndentationChar] = useState('spaces');
  const [indentationSize, setIndentationSize] = useState('2');
  const [codeIntelligence, setCodeIntelligence] = useState(true);
  const [semanticTokens, setSemanticTokens] = useState(true);

  // Show Whitespace Settings
  const [showWhitespaceLeading, setShowWhitespaceLeading] = useState(false);
  const [showWhitespaceEnclosed, setShowWhitespaceEnclosed] = useState(false);
  const [showWhitespaceTrailing, setShowWhitespaceTrailing] = useState(false);
  const [showWhitespaceSelected, setShowWhitespaceSelected] = useState(false);

  // Advanced Developer Settings
  const [keybinds, setKeybinds] = useState('default');
  const [multiselectModifier, setMultiselectModifier] = useState('Alt');
  const [filetreeGitStatus, setFiletreeGitStatus] = useState(true);
  const [accessibleTerminal, setAccessibleTerminal] = useState(false);
  const [shellBellIndicator, setShellBellIndicator] = useState(false);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold mb-1">User Settings</h2>
          <p className="text-sm text-muted-foreground">
            The following settings apply to your account and will be used across all your Apps.
          </p>
        </div>

        {/* Agent & Assistant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Agent & Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="agent-audio">Agent Audio Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Play a sound when the Agent needs your response.
                </p>
              </div>
              <Switch
                id="agent-audio"
                checked={agentAudioNotification}
                onCheckedChange={setAgentAudioNotification}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="agent-push">Agent Push Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Send a push notification when the Agent needs your response.
                </p>
              </div>
              <Switch
                id="agent-push"
                checked={agentPushNotification}
                onCheckedChange={setAgentPushNotification}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="assistant-push">Assistant Push Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Send a push notification when the Assistant needs your response.
                </p>
              </div>
              <Switch
                id="assistant-push"
                checked={assistantPushNotification}
                onCheckedChange={setAssistantPushNotification}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              App Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="auto-preview">Automatic Preview</Label>
                <p className="text-sm text-muted-foreground">
                  Open a web preview automatically when a port is open
                </p>
              </div>
              <Switch
                id="auto-preview"
                checked={automaticPreview}
                onCheckedChange={setAutomaticPreview}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="forward-ports">Forward Opened Ports Automatically</Label>
              <Select value={forwardPorts} onValueChange={setForwardPorts}>
                <SelectTrigger id="forward-ports">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_ports_except_localhost">all ports except localhost</SelectItem>
                  <SelectItem value="all_ports">all ports</SelectItem>
                  <SelectItem value="none">none</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Automatically configure detected newly opened ports.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="font-size">Font Size</Label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger id="font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">small</SelectItem>
                  <SelectItem value="normal">normal</SelectItem>
                  <SelectItem value="large">large</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Change the font size of the editor.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Code Editing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Code Editing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="ai-completion">AI Code Completion</Label>
                <p className="text-sm text-muted-foreground">
                  Code completion provides inline "ghost text" suggestions while you code.
                </p>
              </div>
              <Switch
                id="ai-completion"
                checked={aiCodeCompletion}
                onCheckedChange={setAiCodeCompletion}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="accept-commit">Accept Suggestion on Commit Character</Label>
                <p className="text-sm text-muted-foreground">
                  Controls whether suggestions should be accepted on commit characters.
                </p>
              </div>
              <Switch
                id="accept-commit"
                checked={acceptOnCommitChar}
                onCheckedChange={setAcceptOnCommitChar}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="auto-brackets">Auto close brackets</Label>
                <p className="text-sm text-muted-foreground">
                  Controls whether the editor should automatically close brackets.
                </p>
              </div>
              <Switch
                id="auto-brackets"
                checked={autoCloseBrackets}
                onCheckedChange={setAutoCloseBrackets}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="wrapping">Wrapping</Label>
              <Select value={wrapping} onValueChange={setWrapping}>
                <SelectTrigger id="wrapping">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_wrap">no wrap</SelectItem>
                  <SelectItem value="soft_wrap">soft wrap</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Change whether the editor wraps lines or not.
              </p>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="indent-detection">Indentation Detection</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically detect indentation settings when opening a file.
                </p>
              </div>
              <Switch
                id="indent-detection"
                checked={indentationDetection}
                onCheckedChange={setIndentationDetection}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="format-paste">Format Pasted Text Indentation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically format the indentation of pasted text.
                </p>
              </div>
              <Switch
                id="format-paste"
                checked={formatPastedText}
                onCheckedChange={setFormatPastedText}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="indent-char">Indentation Character</Label>
              <Select value={indentationChar} onValueChange={setIndentationChar}>
                <SelectTrigger id="indent-char">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spaces">spaces</SelectItem>
                  <SelectItem value="tabs">tabs</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                The character used for indenting lines.
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="indent-size">Indentation Size</Label>
              <Input
                id="indent-size"
                type="number"
                value={indentationSize}
                onChange={(e) => setIndentationSize(e.target.value)}
                min="1"
                max="8"
              />
              <p className="text-sm text-muted-foreground">
                The number of columns taken up by an indentation level.
              </p>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="code-intel">Code Intelligence</Label>
                <p className="text-sm text-muted-foreground">
                  Code intelligence gives you autocomplete, as well as hints as you type.
                </p>
              </div>
              <Switch
                id="code-intel"
                checked={codeIntelligence}
                onCheckedChange={setCodeIntelligence}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="semantic-tokens">Semantic Tokens</Label>
                <p className="text-sm text-muted-foreground">
                  Enables enhanced syntax highlighting from language servers.
                </p>
              </div>
              <Switch
                id="semantic-tokens"
                checked={semanticTokens}
                onCheckedChange={setSemanticTokens}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <Label>Show Whitespace</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Make whitespace characters visible, such as tabs and spaces.
              </p>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="whitespace-leading" className="font-normal">Leading</Label>
                <Switch
                  id="whitespace-leading"
                  checked={showWhitespaceLeading}
                  onCheckedChange={setShowWhitespaceLeading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="whitespace-enclosed" className="font-normal">Enclosed</Label>
                <Switch
                  id="whitespace-enclosed"
                  checked={showWhitespaceEnclosed}
                  onCheckedChange={setShowWhitespaceEnclosed}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="whitespace-trailing" className="font-normal">Trailing</Label>
                <Switch
                  id="whitespace-trailing"
                  checked={showWhitespaceTrailing}
                  onCheckedChange={setShowWhitespaceTrailing}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="whitespace-selected" className="font-normal">Selected</Label>
                <Switch
                  id="whitespace-selected"
                  checked={showWhitespaceSelected}
                  onCheckedChange={setShowWhitespaceSelected}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Developer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Advanced Developer Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keybinds">Keybinds</Label>
              <Select value={keybinds} onValueChange={setKeybinds}>
                <SelectTrigger id="keybinds">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">default</SelectItem>
                  <SelectItem value="vim">vim</SelectItem>
                  <SelectItem value="emacs">emacs</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Use another keyboard mapping
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="multiselect">Multiselect Modifier Key</Label>
              <Select value={multiselectModifier} onValueChange={setMultiselectModifier}>
                <SelectTrigger id="multiselect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alt">Alt</SelectItem>
                  <SelectItem value="Ctrl">Ctrl</SelectItem>
                  <SelectItem value="Cmd">Cmd</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Modifier key for selecting multiple items in the filetree.
              </p>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="git-status">Filetree Git Status</Label>
                <p className="text-sm text-muted-foreground">
                  Show the Git status of files in the file tree.
                </p>
              </div>
              <Switch
                id="git-status"
                checked={filetreeGitStatus}
                onCheckedChange={setFiletreeGitStatus}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="accessible-term">Accessible Terminal Output</Label>
                <p className="text-sm text-muted-foreground">
                  Enable this setting to use a screen reader. Warning: this can negatively affect performance.
                </p>
              </div>
              <Switch
                id="accessible-term"
                checked={accessibleTerminal}
                onCheckedChange={setAccessibleTerminal}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="shell-bell">Shell Bell Audible Indicator</Label>
                <p className="text-sm text-muted-foreground">
                  Play sound in the Shell on issues like a failed tab completion.
                </p>
              </div>
              <Switch
                id="shell-bell"
                checked={shellBellIndicator}
                onCheckedChange={setShellBellIndicator}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

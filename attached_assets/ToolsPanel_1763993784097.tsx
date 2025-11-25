import { useState } from "react";
import {
  Database,
  Eye,
  Upload,
  Puzzle,
  HardDrive,
  Shield,
  Lock,
  Sparkles,
  Search as SearchIcon,
  Terminal as TerminalIcon,
  Code,
  Box,
  GitBranch,
  Gamepad2,
  Key,
  Shell,
  ChevronRight,
  Users,
  Save,
  Monitor,
  Workflow,
  Settings,
} from "lucide-react";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";

interface Tool {
  id: string;
  icon: any;
  title: string;
  description: string;
  category?: string;
}

interface ToolsPanelProps {
  onToolSelect?: (toolId: string) => void;
  selectedTool?: string | null;
}

export function ToolsPanel({ onToolSelect, selectedTool }: ToolsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const tools: Tool[] = [
    {
      id: "database",
      icon: Database,
      title: "Replit Database",
      description: "Key-value storage (Replit Database) for your application with 100% Replit API compatibility.",
      category: "Suggested",
    },
    {
      id: "object-storage",
      icon: HardDrive,
      title: "Object Storage",
      description: "Store and manage files, images, audio, and media assets up to 50MB per file.",
      category: "Suggested",
    },
    {
      id: "preview",
      icon: Eye,
      title: "Preview",
      description: "Preview your App",
      category: "Jump to existing tab",
    },
    {
      id: "publishing",
      icon: Upload,
      title: "Publishing",
      description: "Publish a live, public version of your App, unaffected by the changes you make in the Workspace",
      category: "Suggested",
    },
    {
      id: "integrations",
      icon: Puzzle,
      title: "Integrations",
      description: "Connect to Replit-native and external services",
    },
    {
      id: "auth",
      icon: Shield,
      title: "Auth",
      description: "Let users log in to your App using a prebuilt login page",
    },
    {
      id: "security-scanner",
      icon: Lock,
      title: "Security Scanner",
      description: "Scan your App for vulnerabilities",
    },
    {
      id: "secrets",
      icon: Key,
      title: "Secrets",
      description: "Store sensitive information (like API keys) securely in your App",
    },
    {
      id: "assistant",
      icon: Sparkles,
      title: "AI Assistant (Claude)",
      description: "Powered by Claude - answers questions, refines code, and makes precise edits.",
      category: "Featured",
    },
    {
      id: "code-search",
      icon: SearchIcon,
      title: "Code Search",
      description: "Search through the text contents of your App",
    },
    {
      id: "console",
      icon: TerminalIcon,
      title: "Console",
      description: "View the terminal output after running your code",
    },
    {
      id: "developer",
      icon: Code,
      title: "Developer",
      description: "",
    },
    {
      id: "extension-store",
      icon: Box,
      title: "Extension Store",
      description: "Find and install workspace extensions",
    },
    {
      id: "git",
      icon: GitBranch,
      title: "Git",
      description: "Version control for your App",
    },
    {
      id: "playground",
      icon: Gamepad2,
      title: "Playground",
      description: "View and test agents and automations created by Replit Agent.",
    },
    {
      id: "shell",
      icon: Shell,
      title: "Shell",
      description: "Access multiple shell terminals with different environments",
    },
    {
      id: "collaboration",
      icon: Users,
      title: "Collaboration",
      description: "Invite team members and collaborate in real-time",
    },
    {
      id: "workflows",
      icon: Workflow,
      title: "Workflows",
      description: "Automate tasks and processes with custom workflows",
    },
    {
      id: "backup-restore",
      icon: Save,
      title: "Backup & Restore",
      description: "Protect your project with automated and manual backups",
    },
    {
      id: "ssh-access",
      icon: TerminalIcon,
      title: "SSH Access",
      description: "Connect to your development environment via SSH",
    },
    {
      id: "vnc",
      icon: Monitor,
      title: "VNC",
      description: "Access your development environment via graphical desktop",
    },
    {
      id: "user-settings",
      icon: Settings,
      title: "User Settings",
      description: "Manage your account, preferences, and integrations",
    },
  ];

  const filteredTools = tools.filter(
    (tool) =>
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-background border-l flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for tools & features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tools List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredTools.map((tool) => (
            <div key={tool.id}>
              {tool.category && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {tool.category}
                </div>
              )}
              <Button
                variant="ghost"
                className={`w-full justify-start h-auto py-3 px-3 mb-1 ${
                  selectedTool === tool.id ? "bg-accent" : ""
                }`}
                onClick={() => onToolSelect?.(tool.id)}
              >
                <div className="flex items-start gap-3 w-full text-left">
                  <tool.icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{tool.title}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                    {tool.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tool.description}
                      </p>
                    )}
                  </div>
                </div>
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
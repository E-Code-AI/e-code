/**
 * Git Graph - Visual commit history with branches
 * Inspired by GitKraken and VS Code Git Graph
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  Search,
  Calendar,
  User,
  Hash,
  Copy,
  ExternalLink,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface GitCommitNode {
  hash: string;
  shortHash: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  date: Date;
  parents: string[];
  branches: string[];
  tags: string[];
  isMerge: boolean;
}

interface GitGraphProps {
  projectId: string | number;
  className?: string;
  onCommitClick?: (commit: GitCommitNode) => void;
  maxCommits?: number;
}

export function GitGraph({
  projectId,
  className,
  onCommitClick,
  maxCommits = 100
}: GitGraphProps) {
  const [commits, setCommits] = useState<GitCommitNode[]>([]);
  const [filteredCommits, setFilteredCommits] = useState<GitCommitNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Mock data for demonstration (replace with real git API call)
  useEffect(() => {
    const fetchGitHistory = async () => {
      setIsLoading(true);

      // TODO: Replace with actual API call to /api/projects/:id/git/log
      // const response = await fetch(`/api/projects/${projectId}/git/log?limit=${maxCommits}`);
      // const data = await response.json();

      // Mock data
      const mockCommits: GitCommitNode[] = [
        {
          hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
          shortHash: 'a1b2c3d',
          message: 'feat: Add AI Agent autonomous execution',
          author: { name: 'Claude AI', email: 'claude@e-code.ai' },
          date: new Date(Date.now() - 1000 * 60 * 30),
          parents: ['b2c3d4e'],
          branches: ['main', 'HEAD'],
          tags: ['v1.5.0'],
          isMerge: false
        },
        {
          hash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1',
          shortHash: 'b2c3d4e',
          message: 'feat: Complete AI Agent frontend-backend integration',
          author: { name: 'Claude AI', email: 'claude@e-code.ai' },
          date: new Date(Date.now() - 1000 * 60 * 60 * 2),
          parents: ['c3d4e5f'],
          branches: [],
          tags: [],
          isMerge: false
        },
        {
          hash: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2',
          shortHash: 'c3d4e5f',
          message: 'Merge pull request #42 from feature/websocket-integration',
          author: { name: 'GitHub', email: 'noreply@github.com' },
          date: new Date(Date.now() - 1000 * 60 * 60 * 5),
          parents: ['d4e5f6g', 'e5f6g7h'],
          branches: [],
          tags: [],
          isMerge: true
        },
        {
          hash: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3',
          shortHash: 'd4e5f6g',
          message: 'refactor: Improve WebSocket error handling',
          author: { name: 'Developer', email: 'dev@e-code.ai' },
          date: new Date(Date.now() - 1000 * 60 * 60 * 24),
          parents: ['e5f6g7h'],
          branches: [],
          tags: [],
          isMerge: false
        },
        {
          hash: 'e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4',
          shortHash: 'e5f6g7h',
          message: 'fix: Resolve terminal connection race condition',
          author: { name: 'Developer', email: 'dev@e-code.ai' },
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          parents: ['f6g7h8i'],
          branches: ['develop'],
          tags: [],
          isMerge: false
        }
      ];

      setCommits(mockCommits);
      setFilteredCommits(mockCommits);
      setIsLoading(false);
    };

    fetchGitHistory();
  }, [projectId, maxCommits]);

  // Filter commits based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCommits(commits);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = commits.filter(commit =>
      commit.message.toLowerCase().includes(query) ||
      commit.author.name.toLowerCase().includes(query) ||
      commit.shortHash.includes(query)
    );

    setFilteredCommits(filtered);
  }, [searchQuery, commits]);

  // Draw git graph on canvas
  useEffect(() => {
    if (!canvasRef.current || filteredCommits.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const width = 60;
    const height = filteredCommits.length * 50;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw commit nodes and lines
    filteredCommits.forEach((commit, index) => {
      const x = 30;
      const y = index * 50 + 25;

      // Draw line to parent (if not first commit)
      if (index > 0) {
        ctx.strokeStyle = commit.isMerge ? '#F99D25' : '#F26207';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 25);
        ctx.lineTo(x, y - 10);
        ctx.stroke();
      }

      // Draw commit node
      ctx.fillStyle = commit.isMerge ? '#F99D25' : '#F26207';
      ctx.beginPath();
      ctx.arc(x, y, commit.isMerge ? 6 : 5, 0, 2 * Math.PI);
      ctx.fill();

      // Draw ring for selected commit
      if (selectedCommit === commit.hash) {
        ctx.strokeStyle = '#F26207';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
  }, [filteredCommits, selectedCommit]);

  const handleCommitClick = (commit: GitCommitNode) => {
    setSelectedCommit(commit.hash);
    if (onCommitClick) {
      onCommitClick(commit);
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({
      title: "Copied to clipboard",
      description: "Commit hash copied successfully",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Git Graph
          </CardTitle>

          <Badge variant="outline" className="text-xs">
            {filteredCommits.length} commits
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search commits, authors, hashes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Loading git history...
          </div>
        ) : filteredCommits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
            <GitCommit className="h-8 w-8 mb-2 opacity-50" />
            <p>No commits found</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex">
              {/* Graph Canvas */}
              <div className="flex-shrink-0">
                <canvas ref={canvasRef} className="block" />
              </div>

              {/* Commits List */}
              <div className="flex-1 px-3 py-2">
                {filteredCommits.map((commit, index) => (
                  <div
                    key={commit.hash}
                    className={cn(
                      "group relative py-2 px-3 rounded-lg cursor-pointer transition-all",
                      "hover:bg-muted/50",
                      selectedCommit === commit.hash && "bg-muted ring-1 ring-[var(--ecode-orange)]/20"
                    )}
                    style={{ marginTop: index === 0 ? '4px' : '0' }}
                    onClick={() => handleCommitClick(commit)}
                  >
                    {/* Commit message */}
                    <div className="flex items-start gap-2 mb-1">
                      {commit.isMerge && (
                        <GitMerge className="h-3.5 w-3.5 mt-0.5 text-[var(--ecode-yellow)] flex-shrink-0" />
                      )}
                      <p className="text-xs font-medium line-clamp-2 flex-1">
                        {commit.message}
                      </p>
                    </div>

                    {/* Branches and Tags */}
                    {(commit.branches.length > 0 || commit.tags.length > 0) && (
                      <div className="flex items-center gap-1 mb-1">
                        {commit.branches.map(branch => (
                          <Badge
                            key={branch}
                            variant="outline"
                            className="h-4 text-[10px] px-1 bg-[var(--ecode-orange)]/10 text-[var(--ecode-orange)] border-[var(--ecode-orange)]/20"
                          >
                            <GitBranch className="h-2.5 w-2.5 mr-0.5" />
                            {branch}
                          </Badge>
                        ))}
                        {commit.tags.map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="h-4 text-[10px] px-1 bg-green-500/10 text-green-600 border-green-500/20"
                          >
                            <Tag className="h-2.5 w-2.5 mr-0.5" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px]">
                            {getInitials(commit.author.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[100px]">{commit.author.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>{formatDistanceToNow(commit.date, { addSuffix: true })}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Hash className="h-2.5 w-2.5" />
                        <span className="font-mono">{commit.shortHash}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyHash(commit.hash);
                          }}
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  SortAsc,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  MoreVertical,
  Pin,
  Lock,
  Unlock,
  Flag,
  Share2,
  Bookmark,
  BookmarkCheck,
  Code,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
  Image,
  AtSign,
  Hash,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Reply,
  ChevronRight,
  ChevronDown,
  Star,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ThreadAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'admin' | 'moderator' | 'member';
  reputation: number;
}

interface ThreadReply {
  id: string;
  content: string;
  author: ThreadAuthor;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  isLiked: boolean;
  isAccepted: boolean;
  mentions: string[];
}

interface Thread {
  id: string;
  title: string;
  content: string;
  author: ThreadAuthor;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  views: number;
  likes: number;
  replies: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  lastReplyAt?: string;
  lastReplyBy?: ThreadAuthor;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  threadCount: number;
  description: string;
}

const mockCategories: Category[] = [
  { id: 'general', name: 'General Discussion', icon: 'MessageSquare', color: 'bg-blue-500', threadCount: 1247, description: 'General topics and community discussions' },
  { id: 'help', name: 'Help & Support', icon: 'HelpCircle', color: 'bg-green-500', threadCount: 892, description: 'Get help from the community' },
  { id: 'showcase', name: 'Project Showcase', icon: 'Rocket', color: 'bg-purple-500', threadCount: 456, description: 'Share your projects and get feedback' },
  { id: 'tutorials', name: 'Tutorials & Guides', icon: 'BookOpen', color: 'bg-orange-500', threadCount: 324, description: 'Learn from community tutorials' },
  { id: 'feedback', name: 'Feature Requests', icon: 'Lightbulb', color: 'bg-yellow-500', threadCount: 567, description: 'Suggest new features and improvements' },
  { id: 'bugs', name: 'Bug Reports', icon: 'Bug', color: 'bg-red-500', threadCount: 234, description: 'Report and track bugs' },
];

const mockAuthors: ThreadAuthor[] = [
  { id: '1', username: 'johndoe', displayName: 'John Doe', avatarUrl: undefined, role: 'admin', reputation: 15420 },
  { id: '2', username: 'janedeveloper', displayName: 'Jane Developer', avatarUrl: undefined, role: 'moderator', reputation: 8750 },
  { id: '3', username: 'codemaster', displayName: 'Code Master', avatarUrl: undefined, role: 'member', reputation: 4230 },
  { id: '4', username: 'devguru', displayName: 'Dev Guru', avatarUrl: undefined, role: 'member', reputation: 2890 },
];

const mockThreads: Thread[] = [
  {
    id: '1',
    title: 'How to implement real-time collaboration in E-Code?',
    content: 'I\'m trying to implement real-time collaboration features using WebSockets. Has anyone done this before? Looking for best practices and code examples.\n\n```javascript\nconst socket = new WebSocket(\'wss://example.com\');\nsocket.onmessage = (event) => {\n  console.log(event.data);\n};\n```',
    author: mockAuthors[0],
    category: 'help',
    tags: ['websockets', 'real-time', 'collaboration'],
    createdAt: '2024-01-20T10:30:00Z',
    views: 1247,
    likes: 89,
    replies: 23,
    isLiked: false,
    isBookmarked: true,
    isPinned: true,
    isLocked: false,
    isSolved: true,
    lastReplyAt: '2024-01-21T15:45:00Z',
    lastReplyBy: mockAuthors[1],
  },
  {
    id: '2',
    title: 'Announcing E-Code v2.0 - Massive Performance Improvements',
    content: 'We\'re excited to announce the release of E-Code v2.0! This update brings massive performance improvements, including:\n\n- 50% faster code compilation\n- Improved memory management\n- Better TypeScript support\n\nCheck out the full changelog for more details!',
    author: mockAuthors[0],
    category: 'general',
    tags: ['announcement', 'v2.0', 'performance'],
    createdAt: '2024-01-19T08:00:00Z',
    views: 5678,
    likes: 342,
    replies: 67,
    isLiked: true,
    isBookmarked: false,
    isPinned: true,
    isLocked: false,
    isSolved: false,
    lastReplyAt: '2024-01-22T10:30:00Z',
    lastReplyBy: mockAuthors[2],
  },
  {
    id: '3',
    title: 'Built a full-stack e-commerce platform in 48 hours',
    content: 'Just finished building a complete e-commerce platform using E-Code. Features include:\n\n- User authentication\n- Product catalog with search\n- Shopping cart and checkout\n- Stripe payment integration\n- Admin dashboard\n\nHappy to share the code and answer questions!',
    author: mockAuthors[2],
    category: 'showcase',
    tags: ['e-commerce', 'react', 'node.js', 'stripe'],
    createdAt: '2024-01-18T14:20:00Z',
    views: 2345,
    likes: 156,
    replies: 34,
    isLiked: false,
    isBookmarked: false,
    isPinned: false,
    isLocked: false,
    isSolved: false,
    lastReplyAt: '2024-01-20T09:15:00Z',
    lastReplyBy: mockAuthors[3],
  },
  {
    id: '4',
    title: 'Complete Guide to TypeScript Best Practices in E-Code',
    content: 'After working with TypeScript extensively in E-Code, I\'ve compiled a comprehensive guide covering:\n\n1. Type inference strategies\n2. Generic types and utility types\n3. Error handling patterns\n4. Testing with TypeScript\n\nLet me know if you have any questions!',
    author: mockAuthors[1],
    category: 'tutorials',
    tags: ['typescript', 'best-practices', 'guide'],
    createdAt: '2024-01-17T11:00:00Z',
    views: 3456,
    likes: 234,
    replies: 45,
    isLiked: true,
    isBookmarked: true,
    isPinned: false,
    isLocked: false,
    isSolved: false,
    lastReplyAt: '2024-01-21T16:00:00Z',
    lastReplyBy: mockAuthors[0],
  },
  {
    id: '5',
    title: '[Bug] Editor crashes when opening large files',
    content: 'I\'ve noticed that the editor crashes when opening files larger than 10MB. Steps to reproduce:\n\n1. Create a file with >10MB of content\n2. Open the file in the editor\n3. Editor freezes and crashes\n\nBrowser: Chrome 120\nOS: Windows 11',
    author: mockAuthors[3],
    category: 'bugs',
    tags: ['bug', 'editor', 'performance'],
    createdAt: '2024-01-16T09:30:00Z',
    views: 567,
    likes: 23,
    replies: 12,
    isLiked: false,
    isBookmarked: false,
    isPinned: false,
    isLocked: false,
    isSolved: true,
    lastReplyAt: '2024-01-18T14:30:00Z',
    lastReplyBy: mockAuthors[0],
  },
];

const mockReplies: ThreadReply[] = [
  {
    id: '1',
    content: 'Great question! Here\'s how I implemented real-time collaboration:\n\n```javascript\nimport { io } from \'socket.io-client\';\n\nconst socket = io(\'wss://api.example.com\');\n\nsocket.on(\'code-change\', (data) => {\n  editor.updateContent(data);\n});\n```\n\nMake sure to handle reconnection logic and conflict resolution.',
    author: mockAuthors[1],
    createdAt: '2024-01-20T11:15:00Z',
    likes: 45,
    isLiked: true,
    isAccepted: true,
    mentions: ['@johndoe'],
  },
  {
    id: '2',
    content: 'Adding to what @janedeveloper said, you might also want to look into Y.js for CRDT-based collaboration. It handles conflict resolution automatically.',
    author: mockAuthors[2],
    createdAt: '2024-01-20T12:30:00Z',
    likes: 23,
    isLiked: false,
    isAccepted: false,
    mentions: ['@janedeveloper'],
  },
  {
    id: '3',
    content: 'Thanks everyone! The Y.js approach worked perfectly for my use case. Marking this as solved.',
    author: mockAuthors[0],
    createdAt: '2024-01-21T15:45:00Z',
    likes: 12,
    isLiked: false,
    isAccepted: false,
    mentions: [],
  },
];

export default function ThreadsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);

  const [newThread, setNewThread] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
  });

  const [replyContent, setReplyContent] = useState('');

  const filteredThreads = useMemo(() => {
    let threads = [...mockThreads];
    
    if (selectedCategory !== 'all') {
      threads = threads.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      threads = threads.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    switch (sortBy) {
      case 'popular':
        threads.sort((a, b) => b.likes - a.likes);
        break;
      case 'views':
        threads.sort((a, b) => b.views - a.views);
        break;
      case 'replies':
        threads.sort((a, b) => b.replies - a.replies);
        break;
      default:
        threads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return threads;
  }, [selectedCategory, searchQuery, sortBy]);

  const handleCreateThread = () => {
    toast({ title: 'Thread created', description: 'Your thread has been published successfully.' });
    setShowNewThreadDialog(false);
    setNewThread({ title: '', content: '', category: '', tags: '' });
  };

  const handleLikeThread = (thread: Thread) => {
    toast({ title: thread.isLiked ? 'Removed like' : 'Liked', description: `You ${thread.isLiked ? 'removed your like from' : 'liked'} "${thread.title}"` });
  };

  const handleBookmarkThread = (thread: Thread) => {
    toast({ title: thread.isBookmarked ? 'Removed bookmark' : 'Bookmarked', description: `Thread ${thread.isBookmarked ? 'removed from' : 'added to'} bookmarks` });
  };

  const handlePostReply = () => {
    if (!replyContent.trim()) return;
    toast({ title: 'Reply posted', description: 'Your reply has been added to the thread.' });
    setReplyContent('');
  };

  const handleViewThread = (thread: Thread) => {
    setSelectedThread(thread);
    setShowDetailView(true);
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      admin: { variant: 'destructive', label: 'Admin' },
      moderator: { variant: 'default', label: 'Mod' },
      member: { variant: 'secondary', label: 'Member' },
    };
    const config = variants[role] || { variant: 'secondary' as const, label: role };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const inputClassName = "min-h-[44px] border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-primary/20 focus:border-primary/40 focus:ring-2 transition-all duration-200";
  const cardClassName = "border border-border bg-card shadow-sm";

  return (
    <PageShell>
      <div 
        className="min-h-screen bg-background -mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 px-4 pt-4 pb-8 md:px-6 md:pt-6 lg:px-8 lg:pt-8"
        style={{ fontFamily: 'var(--ecode-font-sans)' }}
        data-testid="page-threads"
      >
        <PageHeader
          title="Discussion Threads"
          description="Join the conversation, share knowledge, and connect with the E-Code community."
          icon={MessageSquare}
          actions={(
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="gap-2 border-border bg-card text-foreground hover:bg-muted hover:border-primary/30 transition-all duration-200"
                data-testid="button-my-threads"
              >
                <Users className="h-4 w-4" />
                My Threads
              </Button>
              <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
                    data-testid="button-new-thread"
                  >
                    <Plus className="h-4 w-4" />
                    New Thread
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl" data-testid="dialog-new-thread">
                  <DialogHeader>
                    <DialogTitle>Create New Thread</DialogTitle>
                    <DialogDescription>Start a new discussion with the community.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={newThread.title}
                        onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                        placeholder="Enter a descriptive title..."
                        className={inputClassName}
                        data-testid="input-thread-title"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={newThread.category} onValueChange={(v) => setNewThread({ ...newThread, category: v })}>
                        <SelectTrigger className={inputClassName} data-testid="select-thread-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Content</Label>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-format-bold">
                            <Bold className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-format-italic">
                            <Italic className="h-4 w-4" />
                          </Button>
                          <Separator orientation="vertical" className="h-4" />
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-format-code">
                            <Code className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-format-list">
                            <List className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-format-ordered">
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                          <Separator orientation="vertical" className="h-4" />
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-format-link">
                            <Link className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-format-image">
                            <Image className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-format-mention">
                            <AtSign className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={newThread.content}
                          onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                          placeholder="Write your thread content here... Supports Markdown and code blocks."
                          className="min-h-[200px] border-0 focus:ring-0 rounded-none"
                          data-testid="textarea-thread-content"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Supports Markdown and code blocks with syntax highlighting</p>
                    </div>
                    <div>
                      <Label>Tags</Label>
                      <Input
                        value={newThread.tags}
                        onChange={(e) => setNewThread({ ...newThread, tags: e.target.value })}
                        placeholder="react, typescript, api (comma separated)"
                        className={inputClassName}
                        data-testid="input-thread-tags"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewThreadDialog(false)} data-testid="button-cancel-thread">Cancel</Button>
                    <Button onClick={handleCreateThread} data-testid="button-publish-thread">Publish Thread</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className={cardClassName} data-testid="card-categories">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <button
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedCategory === 'all' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => setSelectedCategory('all')}
                  data-testid="button-category-all"
                >
                  <span>All Categories</span>
                  <Badge variant="secondary">{mockThreads.length}</Badge>
                </button>
                {mockCategories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedCategory === cat.id 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    onClick={() => setSelectedCategory(cat.id)}
                    data-testid={`button-category-${cat.id}`}
                  >
                    <span>{cat.name}</span>
                    <Badge variant="secondary">{cat.threadCount}</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className={cardClassName} data-testid="card-trending-tags">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {['react', 'typescript', 'api', 'websockets', 'performance', 'security', 'testing', 'deployment'].map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10"
                      data-testid={`tag-${tag}`}
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={cardClassName} data-testid="card-top-contributors">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Top Contributors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockAuthors.slice(0, 4).map((author, i) => (
                  <div key={author.id} className="flex items-center gap-3" data-testid={`contributor-${author.id}`}>
                    <span className="text-sm text-muted-foreground w-4">{i + 1}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={author.avatarUrl} />
                      <AvatarFallback>{author.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{author.displayName}</p>
                      <p className="text-xs text-muted-foreground">{author.reputation.toLocaleString()} rep</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <Card className={cardClassName} data-testid="card-thread-filters">
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search threads..."
                      className={`${inputClassName} pl-10`}
                      data-testid="input-search-threads"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-[180px]" data-testid="select-sort-threads">
                      <SortAsc className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="views">Most Views</SelectItem>
                      <SelectItem value="replies">Most Replies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {showDetailView && selectedThread ? (
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  className="gap-2"
                  onClick={() => setShowDetailView(false)}
                  data-testid="button-back-to-list"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Back to Threads
                </Button>

                <Card className={cardClassName} data-testid="card-thread-detail">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {selectedThread.isPinned && <Badge variant="outline"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
                          {selectedThread.isLocked && <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                          {selectedThread.isSolved && <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Solved</Badge>}
                          <Badge variant="secondary">{mockCategories.find(c => c.id === selectedThread.category)?.name}</Badge>
                        </div>
                        <CardTitle className="text-xl">{selectedThread.title}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid="button-thread-menu">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem data-testid="menu-edit-thread"><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem data-testid="menu-share-thread"><Share2 className="h-4 w-4 mr-2" />Share</DropdownMenuItem>
                          <DropdownMenuItem data-testid="menu-flag-thread"><Flag className="h-4 w-4 mr-2" />Report</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" data-testid="menu-delete-thread"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedThread.author.avatarUrl} />
                        <AvatarFallback>{selectedThread.author.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{selectedThread.author.displayName}</span>
                          {getRoleBadge(selectedThread.author.role)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Posted {formatDistanceToNow(new Date(selectedThread.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="thread-content">
                      <p className="whitespace-pre-wrap">{selectedThread.content}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedThread.tags.map((tag) => (
                        <Badge key={tag} variant="outline" data-testid={`thread-tag-${tag}`}>
                          <Hash className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border pt-4">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={selectedThread.isLiked ? 'text-primary' : ''}
                          onClick={() => handleLikeThread(selectedThread)}
                          data-testid="button-like-thread"
                        >
                          <Heart className={`h-4 w-4 mr-1 ${selectedThread.isLiked ? 'fill-current' : ''}`} />
                          {selectedThread.likes}
                        </Button>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {selectedThread.views} views
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {selectedThread.replies} replies
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleBookmarkThread(selectedThread)}
                        data-testid="button-bookmark-thread"
                      >
                        {selectedThread.isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>

                <Card className={cardClassName} data-testid="card-replies">
                  <CardHeader>
                    <CardTitle className="text-lg">{mockReplies.length} Replies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockReplies.map((reply) => (
                      <div 
                        key={reply.id} 
                        className={`p-4 rounded-lg border ${reply.isAccepted ? 'border-green-500 bg-green-500/5' : 'border-border'}`}
                        data-testid={`reply-${reply.id}`}
                      >
                        {reply.isAccepted && (
                          <Badge className="bg-green-500 mb-3"><CheckCircle className="h-3 w-3 mr-1" />Accepted Answer</Badge>
                        )}
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={reply.author.avatarUrl} />
                            <AvatarFallback>{reply.author.displayName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{reply.author.displayName}</span>
                              {getRoleBadge(reply.author.role)}
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="prose prose-sm dark:prose-invert mt-2 max-w-none">
                              <p className="whitespace-pre-wrap text-sm">{reply.content}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                              <Button variant="ghost" size="sm" className={reply.isLiked ? 'text-primary' : ''} data-testid={`button-like-reply-${reply.id}`}>
                                <ThumbsUp className={`h-3 w-3 mr-1 ${reply.isLiked ? 'fill-current' : ''}`} />
                                {reply.likes}
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-reply-to-${reply.id}`}>
                                <Reply className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className={cardClassName} data-testid="card-reply-editor">
                  <CardHeader>
                    <CardTitle className="text-lg">Post a Reply</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="reply-format-bold">
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="reply-format-italic">
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="reply-format-code">
                          <Code className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="reply-format-mention">
                          <AtSign className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write your reply... Supports Markdown and @mentions"
                        className="min-h-[120px] border-0 focus:ring-0 rounded-none"
                        data-testid="textarea-reply-content"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border pt-4">
                    <Button onClick={handlePostReply} disabled={!replyContent.trim()} data-testid="button-post-reply">
                      Post Reply
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredThreads.map((thread) => (
                  <Card 
                    key={thread.id} 
                    className={`${cardClassName} hover:border-primary/30 transition-all cursor-pointer`}
                    onClick={() => handleViewThread(thread)}
                    data-testid={`thread-card-${thread.id}`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10 hidden sm:flex">
                          <AvatarImage src={thread.author.avatarUrl} />
                          <AvatarFallback>{thread.author.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {thread.isPinned && <Pin className="h-3 w-3 text-primary" />}
                            {thread.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                            {thread.isSolved && <CheckCircle className="h-3 w-3 text-green-500" />}
                            <Badge variant="outline" className="text-xs">{mockCategories.find(c => c.id === thread.category)?.name}</Badge>
                          </div>
                          <h3 className="font-medium text-foreground line-clamp-1">{thread.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{thread.content.replace(/```[\s\S]*?```/g, '[code block]')}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className={`h-3 w-3 ${thread.isLiked ? 'fill-primary text-primary' : ''}`} />
                              {thread.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {thread.replies}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {thread.views}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleBookmarkThread(thread); }}
                            data-testid={`button-bookmark-${thread.id}`}
                          >
                            {thread.isBookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {thread.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {thread.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs" data-testid={`thread-${thread.id}-tag-${tag}`}>
                              <Hash className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {thread.tags.length > 4 && (
                            <Badge variant="secondary" className="text-xs">+{thread.tags.length - 4}</Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {filteredThreads.length === 0 && (
                  <Card className={cardClassName} data-testid="card-no-threads">
                    <CardContent className="pt-8 pb-8 text-center">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No threads found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery ? 'Try adjusting your search query or filters.' : 'Be the first to start a discussion!'}
                      </p>
                      <Button onClick={() => setShowNewThreadDialog(true)} data-testid="button-start-thread">
                        <Plus className="h-4 w-4 mr-2" />
                        Start a Thread
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

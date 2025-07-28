import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Code,
  Reply,
  MoreVertical,
  X
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Comment {
  id: number;
  projectId: number;
  fileId: number;
  userId: number;
  username: string;
  lineNumber: number;
  content: string;
  resolved: boolean;
  parentId?: number;
  createdAt: string;
  replies?: Comment[];
}

interface Annotation {
  id: number;
  projectId: number;
  fileId: number;
  userId: number;
  username: string;
  startLine: number;
  endLine: number;
  type: 'suggestion' | 'issue' | 'note' | 'review';
  title: string;
  description: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

interface CommentsPanelProps {
  projectId: number;
  fileId?: number;
  currentLine?: number;
  onClose?: () => void;
}

export function CommentsPanel({ projectId, fileId, currentLine, onClose }: CommentsPanelProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [selectedComment, setSelectedComment] = useState<number | null>(null);
  const [annotationType, setAnnotationType] = useState<Annotation['type']>('note');
  const [annotationTitle, setAnnotationTitle] = useState('');
  const [annotationDescription, setAnnotationDescription] = useState('');
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);

  // Fetch comments
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['/api/projects', projectId, 'comments', fileId],
    queryFn: () => apiRequest(`/api/projects/${projectId}/comments${fileId ? `?fileId=${fileId}` : ''}`),
    refetchInterval: 5000 // Auto-refresh every 5 seconds
  });

  // Fetch annotations
  const { data: annotations = [] } = useQuery<Annotation[]>({
    queryKey: ['/api/projects', projectId, 'annotations'],
    queryFn: () => apiRequest(`/api/projects/${projectId}/annotations`)
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: (data: { content: string; lineNumber?: number; parentId?: number }) =>
      apiRequest(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          fileId,
          lineNumber: data.lineNumber || currentLine
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'comments'] });
      setNewComment('');
      setSelectedComment(null);
    }
  });

  // Resolve comment mutation
  const resolveCommentMutation = useMutation({
    mutationFn: (commentId: number) =>
      apiRequest(`/api/projects/${projectId}/comments/${commentId}/resolve`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'comments'] });
    }
  });

  // Create annotation mutation
  const createAnnotationMutation = useMutation({
    mutationFn: (data: {
      type: Annotation['type'];
      title: string;
      description: string;
      startLine: number;
      endLine: number;
    }) =>
      apiRequest(`/api/projects/${projectId}/annotations`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          fileId
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'annotations'] });
      setShowAnnotationForm(false);
      setAnnotationTitle('');
      setAnnotationDescription('');
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) =>
      apiRequest(`/api/projects/${projectId}/comments/${commentId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'comments'] });
    }
  });

  // Group comments by line number
  const commentsByLine = comments.reduce((acc, comment) => {
    if (!comment.parentId) {
      const line = comment.lineNumber || 0;
      if (!acc[line]) acc[line] = [];
      acc[line].push({
        ...comment,
        replies: comments.filter(c => c.parentId === comment.id)
      });
    }
    return acc;
  }, {} as Record<number, Comment[]>);

  const getAnnotationIcon = (type: Annotation['type']) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="h-4 w-4" />;
      case 'issue': return <AlertCircle className="h-4 w-4" />;
      case 'review': return <Code className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getAnnotationColor = (type: Annotation['type']) => {
    switch (type) {
      case 'suggestion': return 'bg-blue-500';
      case 'issue': return 'bg-red-500';
      case 'review': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Comments & Annotations</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="comments" className="flex-1">
        <TabsList className="w-full">
          <TabsTrigger value="comments" className="flex-1">
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="annotations" className="flex-1">
            Annotations ({annotations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="flex-1 p-4">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-4">
              {Object.entries(commentsByLine).map(([line, lineComments]) => (
                <div key={line} className="space-y-2">
                  {line !== '0' && (
                    <div className="text-sm text-muted-foreground">
                      Line {line}
                    </div>
                  )}
                  {lineComments.map(comment => (
                    <Card key={comment.id} className={cn(
                      "transition-colors",
                      comment.resolved && "opacity-60"
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {comment.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {comment.username}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                                {comment.resolved && (
                                  <Badge variant="secondary" className="text-xs">
                                    Resolved
                                  </Badge>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!comment.resolved && (
                                    <DropdownMenuItem
                                      onClick={() => resolveCommentMutation.mutate(comment.id)}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-2" />
                                      Resolve
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => setSelectedComment(comment.id)}
                                  >
                                    <Reply className="h-3 w-3 mr-2" />
                                    Reply
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                                    className="text-destructive"
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="mt-3 pl-4 border-l-2 space-y-2">
                                {comment.replies.map(reply => (
                                  <div key={reply.id} className="text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {reply.username}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(reply.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="mt-1">{reply.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply form */}
                            {selectedComment === comment.id && (
                              <div className="mt-3">
                                <Textarea
                                  placeholder="Write a reply..."
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  className="min-h-[60px]"
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      createCommentMutation.mutate({
                                        content: newComment,
                                        parentId: comment.id
                                      });
                                    }}
                                    disabled={!newComment.trim()}
                                  >
                                    Reply
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedComment(null);
                                      setNewComment('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* New comment form */}
          <div className="mt-4 pt-4 border-t">
            <Textarea
              placeholder={currentLine ? `Comment on line ${currentLine}...` : "Write a comment..."}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              className="mt-2"
              onClick={() => createCommentMutation.mutate({ content: newComment })}
              disabled={!newComment.trim()}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="annotations" className="flex-1 p-4">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="space-y-3">
              {annotations.map(annotation => (
                <Card key={annotation.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-1 rounded",
                          getAnnotationColor(annotation.type)
                        )}>
                          {getAnnotationIcon(annotation.type)}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {annotation.title}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            Lines {annotation.startLine}-{annotation.endLine} • 
                            {annotation.username} • 
                            {new Date(annotation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        annotation.status === 'resolved' ? 'secondary' :
                        annotation.status === 'dismissed' ? 'outline' :
                        'default'
                      }>
                        {annotation.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{annotation.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* New annotation form */}
          {showAnnotationForm ? (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex gap-2">
                {(['suggestion', 'issue', 'note', 'review'] as const).map(type => (
                  <Button
                    key={type}
                    size="sm"
                    variant={annotationType === type ? 'default' : 'outline'}
                    onClick={() => setAnnotationType(type)}
                  >
                    {getAnnotationIcon(type)}
                    <span className="ml-1 capitalize">{type}</span>
                  </Button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Title"
                value={annotationTitle}
                onChange={(e) => setAnnotationTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
              <Textarea
                placeholder="Description"
                value={annotationDescription}
                onChange={(e) => setAnnotationDescription(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    createAnnotationMutation.mutate({
                      type: annotationType,
                      title: annotationTitle,
                      description: annotationDescription,
                      startLine: currentLine || 1,
                      endLine: currentLine || 1
                    });
                  }}
                  disabled={!annotationTitle.trim() || !annotationDescription.trim()}
                >
                  Create Annotation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAnnotationForm(false);
                    setAnnotationTitle('');
                    setAnnotationDescription('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => setShowAnnotationForm(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              New Annotation
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
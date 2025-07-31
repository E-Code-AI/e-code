import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { GitPullRequest, MessageCircle, CheckCircle, XCircle, Clock, Eye, Users, Code2, GitMerge } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CodeReview {
  id: number;
  title: string;
  description: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  project: {
    id: number;
    name: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  reviewers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    status: 'pending' | 'approved' | 'rejected';
    profileImageUrl?: string;
  }>;
  commentsCount: number;
  changedFiles: number;
  linesAdded: number;
  linesRemoved: number;
  createdAt: string;
  updatedAt: string;
}

export default function CodeReviewsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch code reviews
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["/api/code-reviews", filter, searchQuery],
    queryFn: () => apiRequest(`/api/code-reviews?filter=${filter}&search=${searchQuery}`)
  });

  // Fetch review statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/code-reviews/stats"],
    queryFn: () => apiRequest("/api/code-reviews/stats")
  });

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: (data: { projectId: number; title: string; description: string; files: string[] }) =>
      apiRequest("/api/code-reviews", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-reviews"] });
      toast({
        title: "Review Created",
        description: "Your code review has been created successfully."
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'merged':
        return <GitMerge className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'merged':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Code Reviews</h1>
            <p className="text-gray-600 mt-2">
              Collaborate and improve code quality through peer reviews
            </p>
          </div>
          <Button>
            <GitPullRequest className="h-4 w-4 mr-2" />
            New Review
          </Button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <GitPullRequest className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Reviews</p>
                    <p className="text-2xl font-bold">{stats.totalReviews || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold">{stats.pendingReviews || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-2xl font-bold">{stats.approvedReviews || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Avg Review Time</p>
                    <p className="text-2xl font-bold">{stats.avgReviewTime || '2.5'}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Reviews</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="my-reviews">My Reviews</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-4">
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Select defaultValue="newest">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="most-comments">Most Comments</SelectItem>
                  <SelectItem value="most-changes">Most Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value={filter} className="space-y-4">
            {reviews?.map((review: CodeReview) => (
              <Card key={review.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(review.status)}>
                          {getStatusIcon(review.status)}
                          <span className="ml-1 capitalize">{review.status}</span>
                        </Badge>
                        <h3 className="text-lg font-semibold hover:text-blue-600 cursor-pointer">
                          {review.title}
                        </h3>
                      </div>

                      <p className="text-gray-600 text-sm">{review.description}</p>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={review.author.profileImageUrl} />
                            <AvatarFallback>
                              {review.author.firstName[0]}{review.author.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{review.author.firstName} {review.author.lastName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Code2 className="h-4 w-4" />
                          {review.project.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {review.commentsCount} comments
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {review.changedFiles} files
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="text-green-600">+{review.linesAdded}</span>
                          {" "}
                          <span className="text-red-600">-{review.linesRemoved}</span>
                        </div>
                        <div className="flex -space-x-2">
                          {review.reviewers.slice(0, 3).map((reviewer) => (
                            <Avatar key={reviewer.id} className="h-6 w-6 border-2 border-white">
                              <AvatarImage src={reviewer.profileImageUrl} />
                              <AvatarFallback className="text-xs">
                                {reviewer.firstName[0]}{reviewer.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {review.reviewers.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">+{review.reviewers.length - 3}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          Updated {new Date(review.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {review.status === 'pending' && (
                        <>
                          <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <XCircle className="h-4 w-4 mr-2" />
                            Request Changes
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!reviews?.length && (
              <div className="text-center py-12">
                <GitPullRequest className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No code reviews found</h3>
                <p className="text-gray-500 mb-4">
                  {filter === 'all' 
                    ? "Create your first code review to start collaborating with your team."
                    : `No ${filter} reviews found. Try adjusting your filters.`
                  }
                </p>
                <Button>
                  <GitPullRequest className="h-4 w-4 mr-2" />
                  Create Review
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
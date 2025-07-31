import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Calendar, Star, MessageCircle, Video, Clock, Users, BookOpen, Award } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Mentor {
  id: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  expertise: string[];
  bio: string;
  rating: number;
  totalSessions: number;
  hourlyRate: number;
  availability: string[];
  languages: string[];
  verified: boolean;
}

interface MentorshipSession {
  id: number;
  mentor: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  mentee: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  topic: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  scheduledAt: string;
  duration: number;
  sessionType: 'video' | 'chat' | 'code-review';
}

export default function MentorshipPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState("all");
  const [priceRange, setPriceRange] = useState("all");

  // Fetch mentors
  const { data: mentors, isLoading: mentorsLoading } = useQuery({
    queryKey: ["/api/mentorship/mentors", searchQuery, selectedExpertise, priceRange],
    queryFn: () => apiRequest(`/api/mentorship/mentors?search=${searchQuery}&expertise=${selectedExpertise}&price=${priceRange}`)
  });

  // Fetch user's sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/mentorship/sessions"],
    queryFn: () => apiRequest("/api/mentorship/sessions")
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/mentorship/stats"],
    queryFn: () => apiRequest("/api/mentorship/stats")
  });

  // Book session mutation
  const bookSessionMutation = useMutation({
    mutationFn: (data: { mentorId: number; topic: string; scheduledAt: string; sessionType: string }) =>
      apiRequest("/api/mentorship/sessions", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentorship/sessions"] });
      toast({
        title: "Session Booked",
        description: "Your mentorship session has been scheduled successfully."
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (mentorsLoading || sessionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" />
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
            <h1 className="text-3xl font-bold">Mentorship</h1>
            <p className="text-gray-600 mt-2">
              Connect with experienced developers and accelerate your learning
            </p>
          </div>
          <Button>
            <UserCheck className="h-4 w-4 mr-2" />
            Become a Mentor
          </Button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Active Mentors</p>
                    <p className="text-2xl font-bold">{stats.activeMentors || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Sessions This Month</p>
                    <p className="text-2xl font-bold">{stats.sessionsThisMonth || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Star className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Avg Rating</p>
                    <p className="text-2xl font-bold">{stats.averageRating || 4.8}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{stats.successRate || 95}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="find-mentor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="find-mentor">Find a Mentor</TabsTrigger>
            <TabsTrigger value="my-sessions">My Sessions</TabsTrigger>
            <TabsTrigger value="become-mentor">Become a Mentor</TabsTrigger>
          </TabsList>

          <TabsContent value="find-mentor" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 items-center flex-wrap">
              <Input
                placeholder="Search mentors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Select value={selectedExpertise} onValueChange={setSelectedExpertise}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Expertise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expertise</SelectItem>
                  <SelectItem value="frontend">Frontend</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="fullstack">Full Stack</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="devops">DevOps</SelectItem>
                  <SelectItem value="ai-ml">AI/ML</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="0-50">$0 - $50/hr</SelectItem>
                  <SelectItem value="50-100">$50 - $100/hr</SelectItem>
                  <SelectItem value="100+">$100+/hr</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mentors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mentors?.map((mentor: Mentor) => (
                <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={mentor.user.profileImageUrl} />
                        <AvatarFallback>
                          {mentor.user.firstName[0]}{mentor.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {mentor.user.firstName} {mentor.user.lastName}
                          </h3>
                          {mentor.verified && (
                            <Badge variant="secondary" className="text-xs">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {renderStars(mentor.rating)}
                          <span className="text-sm text-gray-600 ml-1">
                            ({mentor.totalSessions} sessions)
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 line-clamp-3">{mentor.bio}</p>
                    
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {mentor.expertise.slice(0, 3).map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {mentor.expertise.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{mentor.expertise.length - 3} more
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Languages:</span>
                        <span>{mentor.languages.join(", ")}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">${mentor.hourlyRate}/hr</span>
                        <Button size="sm">
                          <Calendar className="h-4 w-4 mr-2" />
                          Book Session
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!mentors?.length && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mentors found</h3>
                <p className="text-gray-500">
                  Try adjusting your search criteria or filters.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-sessions" className="space-y-6">
            <div className="space-y-4">
              {sessions?.map((session: MentorshipSession) => (
                <Card key={session.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={session.mentor.profileImageUrl} />
                          <AvatarFallback>
                            {session.mentor.firstName[0]}{session.mentor.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{session.topic}</h3>
                          <p className="text-sm text-gray-600">
                            with {session.mentor.firstName} {session.mentor.lastName}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(session.scheduledAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {session.duration} min
                            </div>
                            <div className="flex items-center gap-1">
                              {session.sessionType === 'video' ? (
                                <Video className="h-4 w-4" />
                              ) : session.sessionType === 'chat' ? (
                                <MessageCircle className="h-4 w-4" />
                              ) : (
                                <BookOpen className="h-4 w-4" />
                              )}
                              {session.sessionType}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(session.status)}>
                          {session.status}
                        </Badge>
                        {session.status === 'scheduled' && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              Reschedule
                            </Button>
                            <Button size="sm">
                              Join Session
                            </Button>
                          </div>
                        )}
                        {session.status === 'completed' && (
                          <Button variant="outline" size="sm">
                            Rate & Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!sessions?.length && (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
                  <p className="text-gray-500 mb-4">
                    Book your first mentorship session to get started.
                  </p>
                  <Button>
                    <Calendar className="h-4 w-4 mr-2" />
                    Find a Mentor
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="become-mentor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Become a Mentor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Share Your Knowledge</h3>
                    <p className="text-sm text-gray-600">
                      Help other developers grow by sharing your expertise and experience.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Earn Extra Income</h3>
                    <p className="text-sm text-gray-600">
                      Set your own rates and schedule, earning money while helping others.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Build Your Network</h3>
                    <p className="text-sm text-gray-600">
                      Connect with passionate developers and expand your professional network.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-4">Requirements to become a mentor:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      At least 3 years of professional development experience
                    </li>
                    <li className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      Strong communication skills and patience
                    </li>
                    <li className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      Verified E-Code account
                    </li>
                    <li className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      Portfolio of projects or contributions
                    </li>
                  </ul>
                </div>

                <Button className="w-full">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Apply to Become a Mentor
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  Scan, 
  Upload, 
  Search, 
  FileText, 
  Download,
  Library,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  BarChart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScannedBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  pages: number;
  scanProgress: number;
  format: string;
  size: string;
  dateScanned: string;
}

export default function BookScanner() {
  const [scanningProgress, setScanningProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  const [scannedBooks] = useState<ScannedBook[]>([
    {
      id: '1',
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      isbn: '978-0132350884',
      status: 'completed',
      pages: 464,
      scanProgress: 100,
      format: 'PDF',
      size: '12.5 MB',
      dateScanned: '2025-08-04'
    },
    {
      id: '2',
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      author: 'Gang of Four',
      isbn: '978-0201633610',
      status: 'completed',
      pages: 395,
      scanProgress: 100,
      format: 'PDF',
      size: '8.2 MB',
      dateScanned: '2025-08-03'
    }
  ]);

  const handleScan = () => {
    setIsScanning(true);
    setScanningProgress(0);
    
    const interval = setInterval(() => {
      setScanningProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          toast({
            title: "Scan Complete",
            description: "Book has been successfully scanned and added to library.",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const filteredBooks = scannedBooks.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <BookOpen className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Book Scanner</h1>
            <p className="text-muted-foreground">Digitize and manage your book collection</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          Admin Only
        </Badge>
      </div>

      <Tabs defaultValue="scan" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scan">
            <Scan className="h-4 w-4 mr-2" />
            Scan Books
          </TabsTrigger>
          <TabsTrigger value="library">
            <Library className="h-4 w-4 mr-2" />
            Library
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Book Scanner</CardTitle>
              <CardDescription>
                Scan physical books or upload digital copies to your library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN Number</Label>
                  <Input 
                    id="isbn" 
                    placeholder="978-0-123456-78-9"
                    disabled={isScanning}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Book Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Enter book title"
                    disabled={isScanning}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={handleScan} 
                  disabled={isScanning}
                  className="flex-1"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      Start Scan
                    </>
                  )}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload PDF
                </Button>
              </div>

              {isScanning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Scanning progress</span>
                    <span>{scanningProgress}%</span>
                  </div>
                  <Progress value={scanningProgress} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {scannedBooks.slice(0, 5).map(book => (
                    <div key={book.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <p className="text-sm text-muted-foreground">{book.author}</p>
                        </div>
                      </div>
                      <Badge variant={book.status === 'completed' ? 'default' : 'secondary'}>
                        {book.status === 'completed' ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Processing
                          </>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Digital Library</CardTitle>
              <CardDescription>
                Browse and manage your scanned book collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search books by title or author..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Library
                  </Button>
                </div>

                <ScrollArea className="h-[500px]">
                  <div className="grid gap-4">
                    {filteredBooks.map(book => (
                      <Card key={book.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <h3 className="font-semibold">{book.title}</h3>
                              <p className="text-sm text-muted-foreground">by {book.author}</p>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>ISBN: {book.isbn}</span>
                                <span>{book.pages} pages</span>
                                <span>{book.format}</span>
                                <span>{book.size}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Scanned on {book.dateScanned}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Books</p>
                    <p className="text-3xl font-bold">{scannedBooks.length}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pages</p>
                    <p className="text-3xl font-bold">
                      {scannedBooks.reduce((sum, book) => sum + book.pages, 0)}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Storage Used</p>
                    <p className="text-3xl font-bold">20.7 MB</p>
                  </div>
                  <Download className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scanning Activity</CardTitle>
              <CardDescription>Books scanned over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart className="h-12 w-12 mx-auto mb-3" />
                  <p>Analytics visualization will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
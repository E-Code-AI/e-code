import { useState, useRef, useEffect } from "react";
import { File } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Terminal, FileText, Bug, AlertCircle, Info, CheckCircle, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface BottomPanelProps {
  activeFile: File | undefined;
}

type LogType = "info" | "error" | "warning" | "success";

interface LogMessage {
  id: number;
  type: LogType;
  message: string;
  timestamp: Date;
}

const BottomPanel = ({ activeFile }: BottomPanelProps) => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [activeTab, setActiveTab] = useState("console");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Generate some sample logs for demonstration
  useEffect(() => {
    const sampleLogs: LogMessage[] = [
      {
        id: 1,
        type: "info",
        message: "Application started",
        timestamp: new Date(),
      },
      {
        id: 2,
        type: "info",
        message: `Loading file: ${activeFile?.name || "No file selected"}`,
        timestamp: new Date(),
      },
      {
        id: 3,
        type: "success",
        message: "Connected to server",
        timestamp: new Date(),
      },
      {
        id: 4,
        type: "warning",
        message: "This is a warning message",
        timestamp: new Date(),
      },
      {
        id: 5,
        type: "error",
        message: "Failed to load resources: ReferenceError: someVariable is not defined",
        timestamp: new Date(),
      },
    ];
    
    setLogs(sampleLogs);
  }, [activeFile]);
  
  // Auto scroll to bottom when logs update
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [logs]);
  
  // Get icon for log type
  const getLogIcon = (type: LogType) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };
  
  // Get text color for log type
  const getLogTextColor = (type: LogType) => {
    switch (type) {
      case "info":
        return "text-blue-500";
      case "error":
        return "text-red-500";
      case "warning":
        return "text-yellow-500";
      case "success":
        return "text-green-500";
      default:
        return "";
    }
  };
  
  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString();
  };
  
  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };
  
  return (
    <div className="h-full flex flex-col bg-background border rounded-sm overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between px-2 border-b">
          <TabsList className="h-9 p-0 bg-transparent">
            <TabsTrigger
              value="console"
              className="h-9 px-3 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none"
            >
              <Terminal className="h-4 w-4 mr-2" />
              Console
            </TabsTrigger>
            <TabsTrigger
              value="problems"
              className="h-9 px-3 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none"
            >
              <Bug className="h-4 w-4 mr-2" />
              Problems
            </TabsTrigger>
            <TabsTrigger
              value="output"
              className="h-9 px-3 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none"
            >
              <FileText className="h-4 w-4 mr-2" />
              Output
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearLogs}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <TabsContent value="console" className="flex-1 p-0 m-0">
          <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
            <div className="p-2 space-y-1">
              {logs.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">
                  No console logs to display
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start py-1 text-xs border-b border-border/30 last:border-0"
                  >
                    <div className="mr-2 mt-0.5">
                      {getLogIcon(log.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-muted-foreground mr-2">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <span className={cn("font-mono", getLogTextColor(log.type))}>
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="font-mono whitespace-pre-wrap break-all mt-1">
                        {log.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="problems" className="flex-1 p-0 m-0">
          <div className="p-4 text-sm text-muted-foreground">
            No problems detected in your code.
          </div>
        </TabsContent>
        
        <TabsContent value="output" className="flex-1 p-0 m-0">
          <div className="p-4 text-sm text-muted-foreground">
            No output to display.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BottomPanel;
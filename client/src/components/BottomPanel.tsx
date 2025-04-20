import { useState } from "react";
import { File } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, AlertCircle, Info, CheckCircle } from "lucide-react";
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
  // Example log messages - in a real app, these would come from the server
  const [logs] = useState<LogMessage[]>([
    {
      id: 1,
      type: "info",
      message: "Application started",
      timestamp: new Date(),
    },
    {
      id: 2,
      type: "error",
      message: "Failed to connect to database",
      timestamp: new Date(),
    },
    {
      id: 3,
      type: "warning",
      message: "Deprecated API used in component",
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: 4,
      type: "success",
      message: "Database connection established",
      timestamp: new Date(Date.now() - 120000),
    },
  ]);
  
  const getLogIcon = (type: LogType) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "info":
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const getLogTextColor = (type: LogType) => {
    switch (type) {
      case "error":
        return "text-red-500";
      case "warning":
        return "text-yellow-500";
      case "success":
        return "text-green-500";
      case "info":
      default:
        return "text-blue-500";
    }
  };
  
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  return (
    <Tabs defaultValue="console" className="w-full h-full">
      <TabsList className="border-b rounded-none h-10 bg-transparent justify-start">
        <TabsTrigger value="console" className="data-[state=active]:bg-background">
          <Terminal className="h-4 w-4 mr-2" />
          Console
        </TabsTrigger>
        <TabsTrigger value="problems" className="data-[state=active]:bg-background">
          <AlertCircle className="h-4 w-4 mr-2" />
          Problems
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="console" className="mt-0 h-[calc(100%-40px)]">
        <ScrollArea className="h-full">
          <div className="p-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "flex items-start gap-2 py-1 text-sm border-b border-border/50",
                  getLogTextColor(log.type)
                )}
              >
                <div className="mt-0.5">
                  {getLogIcon(log.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{log.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="problems" className="mt-0 h-[calc(100%-40px)]">
        <ScrollArea className="h-full">
          <div className="p-4 text-sm text-muted-foreground">
            {activeFile ? (
              <p>No problems found in {activeFile.name}.</p>
            ) : (
              <p>No file selected.</p>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};

export default BottomPanel;
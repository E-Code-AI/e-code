import { useState } from "react";
import {
  Monitor,
  Power,
  Settings,
  Maximize2,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner@2.0.3";

export function VNCTab() {
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const connect = () => {
    setIsConnected(true);
    toast.success("Connected to VNC");
  };

  const disconnect = () => {
    setIsConnected(false);
    toast.info("Disconnected from VNC");
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              VNC Remote Desktop
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Access your development environment via graphical desktop
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className={
                isConnected
                  ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                  : ""
              }
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {isConnected && (
        <div className="border-b p-2 flex items-center gap-2 bg-muted">
          <Button
            size="sm"
            variant="ghost"
            onClick={disconnect}
            className="text-destructive"
          >
            <Power className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
            <Maximize2 className="w-4 h-4 mr-2" />
            {isFullscreen ? "Exit" : "Fullscreen"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast.success("Refreshing VNC connection...")}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast.info("VNC settings", { description: "Settings panel would open here" })}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>

          <div className="flex-1" />

          <span className="text-xs text-muted-foreground">
            Resolution: 1920x1080 • Latency: 45ms
          </span>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center bg-background">
        {!isConnected ? (
          <ScrollArea className="flex-1 h-full">
            <div className="p-8 max-w-2xl mx-auto">
              <div className="space-y-6">
                {/* Connection Card */}
                <div className="p-6 border rounded-lg text-center">
                  <Monitor className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <h3 className="mb-2">VNC Remote Desktop</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Access your development environment with a full graphical desktop
                  </p>
                  <Button onClick={connect} size="lg">
                    <Wifi className="w-4 h-4 mr-2" />
                    Connect to VNC
                  </Button>
                </div>

                {/* Connection Settings */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="text-sm">Connection Settings</h3>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="resolution">Display Resolution</Label>
                      <Select defaultValue="1920x1080">
                        <SelectTrigger id="resolution">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                          <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                          <SelectItem value="2560x1440">2560x1440 (2K)</SelectItem>
                          <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="quality">Image Quality</Label>
                      <Select defaultValue="high">
                        <SelectTrigger id="quality">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (faster)</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="lossless">Lossless (slower)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="desktop">Desktop Environment</Label>
                      <Select defaultValue="xfce">
                        <SelectTrigger id="desktop">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="xfce">XFCE (Light)</SelectItem>
                          <SelectItem value="gnome">GNOME</SelectItem>
                          <SelectItem value="kde">KDE Plasma</SelectItem>
                          <SelectItem value="mate">MATE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Clipboard Sync</Label>
                        <p className="text-xs text-muted-foreground">
                          Share clipboard between local and remote
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Sound</Label>
                        <p className="text-xs text-muted-foreground">
                          Stream audio from remote desktop
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>View Only Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Disable keyboard and mouse input
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="text-sm">Features</h3>
                  <div className="grid gap-2">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                      <div>
                        <p className="text-sm">Full GUI Access</p>
                        <p className="text-xs text-muted-foreground">
                          Complete graphical desktop environment
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                      <div>
                        <p className="text-sm">GPU Acceleration</p>
                        <p className="text-xs text-muted-foreground">
                          Hardware-accelerated graphics rendering
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                      <div>
                        <p className="text-sm">Persistent Sessions</p>
                        <p className="text-xs text-muted-foreground">
                          Your desktop persists between connections
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                      <div>
                        <p className="text-sm">Multiple Monitors</p>
                        <p className="text-xs text-muted-foreground">
                          Support for multi-display setups
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Connection Information
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    VNC sessions are encrypted and run in an isolated environment.
                    Performance depends on your network connection. For best results,
                    use a wired connection or high-speed WiFi.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-2">VNC Desktop Connected</p>
              <p className="text-sm text-gray-500">
                Desktop environment is loading...
              </p>
              <div className="mt-4 bg-gray-800 rounded-lg p-8 max-w-2xl">
                <p className="text-gray-500 text-sm">
                  [Simulated VNC Desktop Display]
                  <br />
                  In production, the remote desktop would render here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

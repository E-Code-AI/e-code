import { useState } from "react";
import { useEnvironment, EnvironmentVariable } from "@/hooks/useEnvironment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, MoreVertical, Plus, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";

interface EnvironmentPanelProps {
  projectId: number;
}

export default function EnvironmentPanel({ projectId }: EnvironmentPanelProps) {
  const {
    variables,
    isLoading,
    createVariableMutation,
    updateVariableMutation,
    deleteVariableMutation,
  } = useEnvironment();

  const [newVariable, setNewVariable] = useState({
    key: "",
    value: "",
    isSecret: false,
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<EnvironmentVariable | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});

  const handleCreateVariable = () => {
    createVariableMutation.mutate(
      {
        projectId,
        variable: newVariable,
      },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          setNewVariable({ key: "", value: "", isSecret: false });
        },
      }
    );
  };

  const handleDeleteVariable = () => {
    if (selectedVariable) {
      deleteVariableMutation.mutate(
        {
          id: selectedVariable.id,
          projectId,
        },
        {
          onSuccess: () => {
            setDeleteDialogOpen(false);
            setSelectedVariable(null);
          },
        }
      );
    }
  };

  const toggleShowSecret = (id: number) => {
    setShowSecrets(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="border-0 shadow-none flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Configure environment variables for your project
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Variable
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Environment Variable</DialogTitle>
                  <DialogDescription>
                    Environment variables are available to your project at runtime.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key">Key</Label>
                    <Input
                      id="key"
                      placeholder="DATABASE_URL"
                      value={newVariable.key}
                      onChange={(e) =>
                        setNewVariable({ ...newVariable, key: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Value</Label>
                    <Input
                      id="value"
                      placeholder="postgres://username:password@host:port/database"
                      value={newVariable.value}
                      onChange={(e) =>
                        setNewVariable({ ...newVariable, value: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="secret"
                      checked={newVariable.isSecret}
                      onCheckedChange={(checked) =>
                        setNewVariable({ ...newVariable, isSecret: checked })
                      }
                    />
                    <Label htmlFor="secret">Secret variable (hide value)</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateVariable}
                    disabled={!newVariable.key || createVariableMutation.isPending}
                  >
                    {createVariableMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Variable
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-1">
          <Tabs defaultValue="variables" className="h-full flex flex-col">
            <TabsList className="mb-4 w-full grid grid-cols-2">
              <TabsTrigger value="variables">Project Variables</TabsTrigger>
              <TabsTrigger value="secrets">System Secrets</TabsTrigger>
            </TabsList>
            <TabsContent
              value="variables"
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full w-full pr-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : variables.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">
                      No environment variables yet
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Variable
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Name</TableHead>
                        <TableHead className="w-[60%]">Value</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variables.map((variable) => (
                        <TableRow key={variable.id}>
                          <TableCell className="font-mono">
                            {variable.key}
                            {variable.isSecret && (
                              <span className="ml-2 text-xs py-0.5 px-1.5 rounded-sm bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                                Secret
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono">
                            <div className="flex items-center">
                              {variable.isSecret ? (
                                showSecrets[variable.id] ? (
                                  variable.value
                                ) : (
                                  "••••••••••••••••"
                                )
                              ) : (
                                variable.value
                              )}
                              {variable.isSecret && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 ml-2"
                                  onClick={() => toggleShowSecret(variable.id)}
                                >
                                  {showSecrets[variable.id] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <AlertDialog open={deleteDialogOpen && selectedVariable?.id === variable.id} onOpenChange={setDeleteDialogOpen}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setSelectedVariable(variable);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Environment Variable
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the environment variable{" "}
                                    <span className="font-mono font-bold">
                                      {selectedVariable?.key}
                                    </span>
                                    ? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={handleDeleteVariable}
                                  >
                                    {deleteVariableMutation.isPending && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent
              value="secrets"
              className="flex-1 overflow-hidden"
            >
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="bg-muted/50 p-8 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">System Secrets</h3>
                  <p className="text-muted-foreground mb-4">
                    System secrets are automatically provided by the platform.
                    These include secrets needed for database connections and system services.
                  </p>
                  <div className="bg-background border rounded-md p-4 font-mono text-sm text-left">
                    <div className="flex justify-between py-1">
                      <span>DATABASE_URL</span>
                      <span className="text-muted-foreground">••••••••••••••••</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>PGHOST</span>
                      <span className="text-muted-foreground">••••••••••••••••</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>PGDATABASE</span>
                      <span className="text-muted-foreground">••••••••••••••••</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>PGUSER</span>
                      <span className="text-muted-foreground">••••••••••••••••</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>PGPASSWORD</span>
                      <span className="text-muted-foreground">••••••••••••••••</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>PGPORT</span>
                      <span className="text-muted-foreground">••••••••••••••••</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
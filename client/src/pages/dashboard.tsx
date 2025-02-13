import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, LogOut, Briefcase, FolderKanban, CheckSquare, Brain, Terminal } from "lucide-react";
import type { Workspace, Project, Task, SSHConfig } from "@shared/schema";
import { createWorkspace, createProject, createTask, updateTask, deleteTask } from "@/lib/taskade";
import { queryClient } from "@/lib/queryClient";
import { sshConfigSchema } from "@shared/schema";
import { z } from "zod";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            setTaskDescription('');
            break;
          case 'Enter':
            if (taskDescription && selectedProject) {
              e.preventDefault();
              handleCreateTask(new Event('submit') as any);
            }
            break;
        }
      }
    };

const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === '?' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setShowKeyboardShortcuts(true);
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);

    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [taskDescription, selectedProject]);
  const { toast } = useToast();
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [sshConfig, setSSHConfig] = useState<SSHConfig>({
    host: "",
    port: 22,
    username: "",
    privateKey: "",
    passphrase: undefined,
  });
  const [command, setCommand] = useState("");
  const [commandOutput, setCommandOutput] = useState<{ stdout: string; stderr: string } | null>(null);

  // Queries
  const { data: workspaces, isLoading: loadingWorkspaces } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/workspaces", selectedWorkspace, "projects"],
    enabled: !!selectedWorkspace,
  });

  const { data: tasks, isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/projects", selectedProject, "tasks"],
    enabled: !!selectedProject,
  });

  // Mutations
  const createWorkspaceMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setNewItemName("");
      toast({ title: "Workspace created successfully" });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: ({ name, workspaceId }: { name: string; workspaceId: number }) =>
      createProject(workspaceId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/workspaces", selectedWorkspace, "projects"],
      });
      setNewItemName("");
      toast({ title: "Project created successfully" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async ({ projectId, description }: { projectId: number; description: string }) => {
      return createTask(projectId.toString(), description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", selectedProject, "tasks"],
      });
      setTaskDescription("");
      toast({ title: "Task created successfully" });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Failed to create task",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: Partial<Task> }) => {
      return updateTask(taskId.toString(), updates);
    },
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects", selectedProject, "tasks"] });
      const previousTasks = queryClient.getQueryData(["/api/projects", selectedProject, "tasks"]);
      queryClient.setQueryData(["/api/projects", selectedProject, "tasks"], (old: Task[] = []) => {
        return old.map(task => task.id === taskId ? { ...task, ...updates } : task);
      });
      return { previousTasks };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(["/api/projects", selectedProject, "tasks"], context?.previousTasks);
      toast({
        title: "Failed to update task",
        description: err.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", selectedProject, "tasks"],
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Failed to update task",
        description: message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return deleteTask(taskId.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", selectedProject, "tasks"],
      });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Failed to delete task",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;
    createWorkspaceMutation.mutate(newItemName);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !selectedWorkspace) return;
    createProjectMutation.mutate({ name: newItemName, workspaceId: selectedWorkspace });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim()) {
      toast({
        title: "Invalid task",
        description: "Task description cannot be empty",
        variant: "destructive",
      });
      return;
    }
    if (!selectedProject) {
      toast({
        title: "No project selected",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }
    createTaskMutation.mutate({ projectId: selectedProject, description: taskDescription.trim() });
  };

  const handleTaskBreakdown = async (taskId: number, title: string) => {
    try {
      const subtasks = await suggestTaskBreakdown(title);
      for (const subtask of subtasks) {
        await createTaskMutation.mutateAsync({
          projectId: selectedProject!,
          description: subtask,
        });
      }
      toast({ title: "Task breakdown created" });
    } catch (error) {
      toast({
        title: "Failed to create task breakdown",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const connectSSH = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sshConfig) return;

    try {
      await apiRequest("POST", "/api/ssh/connect", sshConfig);
      toast({ title: "SSH connection configured successfully" });
    } catch (error) {
      toast({
        title: "Failed to configure SSH connection",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) {
      toast({
        title: "Invalid command",
        description: "Please enter a command to execute",
        variant: "destructive",
      });
      return;
    }

    try {
      setCommandOutput(null);
      const res = await apiRequest("POST", "/api/ssh/execute", { command });
      const output = await res.json();
      if (output.stderr) {
        toast({
          title: "Command executed with errors",
          description: "Check the output for details",
          variant: "warning",
        });
      } else {
        toast({
          title: "Command executed successfully",
        });
      }
      setCommandOutput(output);
      setCommand("");
    } catch (error) {
      toast({
        title: "Failed to execute command",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const apiRequest = async (method: string, url: string, data: any) => {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || response.statusText);
    }
    return response;
  };

  const handleChatGPTAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const chatGPT = new ChatGPTClient({
        endpoint: "YOUR_CUSTOM_ENDPOINT",
        apiKey: "YOUR_CUSTOM_KEY" // Optional
      });
      await chatGPT.connect({
        endpoint: "YOUR_CUSTOM_ENDPOINT",
        apiKey: "YOUR_CUSTOM_KEY" // Optional
      });
      toast({ title: "Successfully connected to custom ChatGPT" });
    } catch (error) {
      toast({ 
        title: "Failed to connect to ChatGPT",
        variant: "destructive"
      });
    }
  };

  const updateSSHConfig = (field: keyof SSHConfig, value: string | number) => {
    setSSHConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Taskade AI</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6 flex-1">
          {/* Workspaces Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Workspaces
              </h2>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Create Workspace</SheetTitle>
                    <SheetDescription>
                      Enter a name for your new workspace
                    </SheetDescription>
                  </SheetHeader>
                  <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4">
                    <Input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Workspace name"
                    />
                    <Button
                      type="submit"
                      disabled={createWorkspaceMutation.isPending}
                      className="w-full"
                    >
                      {createWorkspaceMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Workspace
                    </Button>
                  </form>
                </SheetContent>
              </Sheet>
            </div>
            {loadingWorkspaces ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {workspaces?.map((workspace) => (
                  <Button
                    key={workspace.id}
                    variant={selectedWorkspace === workspace.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedWorkspace(workspace.id)}
                  >
                    {workspace.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Projects Section */}
          {selectedWorkspace && (
            <div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Projects
                </h2>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Create Project</SheetTitle>
                      <SheetDescription>
                        Enter a name for your new project
                      </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
                      <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Project name"
                      />
                      <Button
                        type="submit"
                        disabled={createProjectMutation.isPending}
                        className="w-full"
                      >
                        {createProjectMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Project
                      </Button>
                    </form>
                  </SheetContent>
                </Sheet>
              </div>
              {loadingProjects ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {projects?.map((project) => (
                    <Button
                      key={project.id}
                      variant={selectedProject === project.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedProject(project.id)}
                    >
                      {project.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto pt-4">
          <p className="text-sm text-muted-foreground">
            Logged in as {user?.username}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <nav className="mb-4">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            <li>Workspaces</li>
            {selectedWorkspace && workspaces && (
              <>
                <li>/</li>
                <li>{workspaces.find(w => w.id === selectedWorkspace)?.name}</li>
              </>
            )}
            {selectedProject && projects && (
              <>
                <li>/</li>
                <li>{projects.find(p => p.id === selectedProject)?.name}</li>
              </>
            )}
          </ol>
        </nav>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connect to ChatGPT</CardTitle>
            <CardDescription>
              ChatGPT connection is handled by the server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChatGPTAuth} className="space-y-4">
              <Button type="submit">Connect to ChatGPT</Button>
            </form>
          </CardContent>
        </Card>
        {selectedProject ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Task</CardTitle>
                <CardDescription>
                  Describe your task and let AI help analyze it
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <Input
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Describe your task..."
                  />
                  <Button
                    type="submit"
                    disabled={createTaskMutation.isPending}
                  >
                    {createTaskMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Task
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {loadingTasks ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                tasks?.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateTaskMutation.mutate({
                                id: task.id,
                                completed: !task.completed,
                              })
                            }
                          >
                            <CheckSquare
                              className={`h-5 w-5 ${task.completed ? "text-green-500" : "text-gray-400"}`}
                            />
                          </Button>
                          <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                            {task.title}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTaskBreakdown(task.id, task.title)}
                            disabled={createTaskMutation.isPending}
                          >
                            {createTaskMutation.isPending ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Brain className="h-5 w-5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this task?")) {
                                deleteTaskMutation.mutate(task.id);
                              }
                            }}
                          >
                            <Plus className="h-5 w-5 rotate-45" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>

<Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Keyboard Shortcuts</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>Ctrl/⌘ + N</div>
        <div>New Task</div>
        <div>Ctrl/⌘ + Enter</div>
        <div>Create Task</div>
        <div>Ctrl/⌘ + ?</div>
        <div>Show Shortcuts</div>
      </div>
    </div>
  </DialogContent>
</Dialog>

                  </Card>
                ))
              )}
            </div>
            {selectedProject && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    SSH Remote Execution
                  </CardTitle>
                  <CardDescription>
                    Execute commands on your remote VPS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* SSH Configuration Form */}
                    <form onSubmit={connectSSH} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="host">Host</Label>
                          <Input
                            id="host"
                            value={sshConfig.host}
                            onChange={(e) => updateSSHConfig('host', e.target.value)}
                            placeholder="example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="port">Port</Label>
                          <Input
                            id="port"
                            type="number"
                            value={sshConfig.port}
                            onChange={(e) => updateSSHConfig('port', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={sshConfig.username}
                          onChange={(e) => updateSSHConfig('username', e.target.value)}
                          placeholder="root"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="privateKey">Private Key</Label>
                        <textarea
                          id="privateKey"
                          className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          value={sshConfig.privateKey}
                          onChange={(e) => updateSSHConfig('privateKey', e.target.value)}
                          placeholder="Paste your private key here"
                          spellCheck="false"
                        />
                        <p className="text-sm text-muted-foreground">
                          Your private key will be securely stored and encrypted
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="passphrase">Passphrase (Optional)</Label>
                        <Input
                          id="passphrase"
                          type="password"
                          value={sshConfig.passphrase || ''}
                          onChange={(e) => updateSSHConfig('passphrase', e.target.value)}
                        />
                      </div>
                      <Button type="submit" disabled={isConnecting}>
                        {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Configure SSH Connection
                      </Button>
                    </form>

                    <Separator />

                    <form onSubmit={executeCommand} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="command">Command</Label>
                        <Input
                          id="command"
                          value={command}
                          onChange={(e) => setCommand(e.target.value)}
                          placeholder="ls -la"
                        />
                      </div>
                      <Button type="submit">Execute Command</Button>
                    </form>

                    {commandOutput && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium">Output:</h4>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                          {commandOutput.stdout}
                          {commandOutput.stderr && (
                            <span className="text-red-500">{commandOutput.stderr}</span>
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a project to view and manage tasks
          </div>
        )}
      </main>
    </div>
  );
}

async function suggestTaskBreakdown(title: string): Promise<string[]> {
  //Implementation for task breakdown
  return ["Subtask 1", "Subtask 2"];
}
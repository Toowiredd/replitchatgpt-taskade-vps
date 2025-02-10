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
import { analyzeTaskDescription, suggestTaskBreakdown } from "@/lib/openai";
import { queryClient } from "@/lib/queryClient";
import { sshConfigSchema } from "@shared/schema";
import { z } from "zod";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [sshConfig, setSSHConfig] = useState<z.infer<typeof sshConfigSchema> | null>(null);
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
      const analysis = await analyzeTaskDescription(description);
      return createTask(projectId, analysis.title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", selectedProject, "tasks"],
      });
      setTaskDescription("");
      toast({ title: "Task created successfully" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", selectedProject, "tasks"],
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", selectedProject, "tasks"],
      });
      toast({ title: "Task deleted successfully" });
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
    if (!taskDescription || !selectedProject) return;
    createTaskMutation.mutate({ projectId: selectedProject, description: taskDescription });
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
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command) return;

    try {
      const res = await apiRequest("POST", "/api/ssh/execute", { command });
      const output = await res.json();
      setCommandOutput(output);
      setCommand("");
    } catch (error) {
      toast({
        title: "Failed to execute command",
        description: error.message,
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
                          >
                            <Brain className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                          >
                            <Plus className="h-5 w-5 rotate-45" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
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
                    <form onSubmit={connectSSH} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="host">Host</Label>
                          <Input
                            id="host"
                            value={sshConfig?.host || ""}
                            onChange={(e) =>
                              setSSHConfig((prev) => ({ ...prev, host: e.target.value }))
                            }
                            placeholder="example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="port">Port</Label>
                          <Input
                            id="port"
                            type="number"
                            value={sshConfig?.port || 22}
                            onChange={(e) =>
                              setSSHConfig((prev) => ({
                                ...prev,
                                port: parseInt(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={sshConfig?.username || ""}
                          onChange={(e) =>
                            setSSHConfig((prev) => ({ ...prev, username: e.target.value }))
                          }
                          placeholder="root"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="privateKey">Private Key</Label>
                        <Input
                          id="privateKey"
                          type="password"
                          value={sshConfig?.privateKey || ""}
                          onChange={(e) =>
                            setSSHConfig((prev) => ({ ...prev, privateKey: e.target.value }))
                          }
                          placeholder="-----BEGIN RSA PRIVATE KEY-----"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="passphrase">Passphrase (Optional)</Label>
                        <Input
                          id="passphrase"
                          type="password"
                          value={sshConfig?.passphrase || ""}
                          onChange={(e) =>
                            setSSHConfig((prev) => ({ ...prev, passphrase: e.target.value }))
                          }
                        />
                      </div>
                      <Button type="submit">Configure SSH Connection</Button>
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
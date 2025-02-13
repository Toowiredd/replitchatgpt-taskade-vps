
import type { Workspace, Project, Task, Comment, List } from "@shared/schema";

const TASKADE_API_BASE = "https://api.taskade.com/v1";

async function taskadeRequest(
  method: string,
  endpoint: string,
  data?: unknown
): Promise<any> {
  const headers = {
    "Authorization": `Bearer ${import.meta.env.VITE_TASKADE_API_KEY}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(`${TASKADE_API_BASE}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Taskade API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Workspace operations with full features
export async function createWorkspace(name: string, settings?: any): Promise<Workspace> {
  return taskadeRequest("POST", "/workspaces", { name, settings });
}

export async function getWorkspaces(): Promise<Workspace[]> {
  return taskadeRequest("GET", "/workspaces");
}

export async function updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace> {
  return taskadeRequest("PATCH", `/workspaces/${id}`, updates);
}

// Project operations with templates
export async function createProject(workspaceId: string, name: string, template?: string): Promise<Project> {
  return taskadeRequest("POST", `/workspaces/${workspaceId}/projects`, { name, template });
}

export async function getProjects(workspaceId: string): Promise<Project[]> {
  return taskadeRequest("GET", `/workspaces/${workspaceId}/projects`);
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  return taskadeRequest("PATCH", `/projects/${id}`, updates);
}

// Enhanced task operations
export async function createTask(
  projectId: string,
  title: string,
  options?: {
    priority?: 'low' | 'medium' | 'high';
    dueDate?: Date;
    assignees?: string[];
    labels?: string[];
    description?: string;
  }
): Promise<Task> {
  return taskadeRequest("POST", `/projects/${projectId}/tasks`, {
    title,
    ...options,
    dueDate: options?.dueDate?.toISOString(),
  });
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  return taskadeRequest("PATCH", `/tasks/${taskId}`, updates);
}

export async function deleteTask(taskId: string): Promise<void> {
  await taskadeRequest("DELETE", `/tasks/${taskId}`);
}

export async function getTasks(projectId: string): Promise<Task[]> {
  return taskadeRequest("GET", `/projects/${projectId}/tasks`);
}

// Comment functionality
export async function addComment(taskId: string, content: string): Promise<Comment> {
  return taskadeRequest("POST", `/tasks/${taskId}/comments`, { content });
}

export async function getComments(taskId: string): Promise<Comment[]> {
  return taskadeRequest("GET", `/tasks/${taskId}/comments`);
}

// List operations
export async function createList(projectId: string, name: string): Promise<List> {
  return taskadeRequest("POST", `/projects/${projectId}/lists`, { name });
}

export async function getLists(projectId: string): Promise<List[]> {
  return taskadeRequest("GET", `/projects/${projectId}/lists`);
}

// Task assignment
export async function assignTask(taskId: string, userId: string): Promise<Task> {
  return taskadeRequest("POST", `/tasks/${taskId}/assign`, { userId });
}

// Task status and labels
export async function setTaskStatus(taskId: string, status: string): Promise<Task> {
  return taskadeRequest("PATCH", `/tasks/${taskId}/status`, { status });
}

export async function addTaskLabel(taskId: string, label: string): Promise<Task> {
  return taskadeRequest("POST", `/tasks/${taskId}/labels`, { label });
}

// Task relationships
export async function createSubtask(parentTaskId: string, title: string): Promise<Task> {
  return taskadeRequest("POST", `/tasks/${parentTaskId}/subtasks`, { title });
}

export async function linkTasks(taskId: string, linkedTaskId: string): Promise<void> {
  return taskadeRequest("POST", `/tasks/${taskId}/links/${linkedTaskId}`);
}

// Task attachments
export async function addTaskAttachment(taskId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  return taskadeRequest("POST", `/tasks/${taskId}/attachments`, formData);
}

// Agent operations
export async function createAgent(name: string, description: string) {
  return taskadeRequest("POST", "/agents", { name, description });
}

export async function getAgents() {
  return taskadeRequest("GET", "/agents");
}

export async function executeAgentAction(agentId: string, action: string, parameters: Record<string, any>) {
  return taskadeRequest("POST", `/agents/${agentId}/execute`, { 
    action,
    parameters 
  });
}

export async function getAgentExecutions(agentId: string) {
  return taskadeRequest("GET", `/agents/${agentId}/executions`);
}

export async function stopAgentExecution(agentId: string, executionId: string) {
  return taskadeRequest("POST", `/agents/${agentId}/executions/${executionId}/stop`);
}

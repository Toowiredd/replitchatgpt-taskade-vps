import type { Workspace, Project, Task } from "@shared/schema";

const TASKADE_API_BASE = "https://api.taskade.com/v1";

// Helper function to make authenticated requests to Taskade API
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

// Workspace operations
export async function createWorkspace(name: string): Promise<Workspace> {
  return taskadeRequest("POST", "/workspaces", { name });
}

export async function getWorkspaces(): Promise<Workspace[]> {
  return taskadeRequest("GET", "/workspaces");
}

// Project operations
export async function createProject(workspaceId: string, name: string): Promise<Project> {
  return taskadeRequest("POST", `/workspaces/${workspaceId}/projects`, { name });
}

export async function getProjects(workspaceId: string): Promise<Project[]> {
  return taskadeRequest("GET", `/workspaces/${workspaceId}/projects`);
}

// Task operations
export async function createTask(projectId: string, title: string): Promise<Task> {
  return taskadeRequest("POST", `/projects/${projectId}/tasks`, { title });
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

// Comment operations
export async function addComment(taskId: string, content: string): Promise<Comment> {
  return taskadeRequest("POST", `/tasks/${taskId}/comments`, { content });
}

export async function getComments(taskId: string): Promise<Comment[]> {
  return taskadeRequest("GET", `/tasks/${taskId}/comments`);
}

// Subtask operations
export async function addSubtask(taskId: string, title: string): Promise<Task> {
  return taskadeRequest("POST", `/tasks/${taskId}/subtasks`, { title });
}

export async function getSubtasks(taskId: string): Promise<Task[]> {
  return taskadeRequest("GET", `/tasks/${taskId}/subtasks`);
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

// Task status
export async function setTaskStatus(taskId: string, status: string): Promise<Task> {
  return taskadeRequest("PATCH", `/tasks/${taskId}/status`, { status });
}
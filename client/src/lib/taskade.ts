// Import required types
import type { Workspace, Project, Task } from "@shared/schema";
import { apiRequest } from "./queryClient";

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
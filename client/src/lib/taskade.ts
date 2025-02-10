import { apiRequest } from "./queryClient";
import type { Workspace, Project, Task } from "@shared/schema";

export async function createWorkspace(name: string): Promise<Workspace> {
  const res = await apiRequest("POST", "/api/workspaces", { name });
  return res.json();
}

export async function createProject(
  workspaceId: number,
  name: string,
): Promise<Project> {
  const res = await apiRequest("POST", `/api/workspaces/${workspaceId}/projects`, {
    name,
  });
  return res.json();
}

export async function createTask(
  projectId: number,
  title: string,
): Promise<Task> {
  const res = await apiRequest("POST", `/api/projects/${projectId}/tasks`, {
    title,
  });
  return res.json();
}

export async function updateTask(
  taskId: number,
  updates: Partial<Task>,
): Promise<Task> {
  const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
  return res.json();
}

export async function deleteTask(taskId: number): Promise<void> {
  await apiRequest("DELETE", `/api/tasks/${taskId}`);
}

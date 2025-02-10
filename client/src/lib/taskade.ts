import { Taskade } from '@taskade/sdk';

import { apiRequest } from "./queryClient";
import type { Workspace, Project, Task } from "@shared/schema";

const taskade = new Taskade({
  apiKey: import.meta.env.VITE_TASKADE_API_KEY
});

export async function createWorkspace(name: string) {
  return await taskade.workspaces.create({ name });
}

export async function createProject(workspaceId: string, name: string) {
  return await taskade.projects.create({ workspaceId, name });
}

export async function createTask(projectId: string, title: string) {
  return await taskade.tasks.create({ projectId, content: title });
}

export async function updateTask(taskId: string, updates: any) {
  return await taskade.tasks.update(taskId, updates);
}

export async function deleteTask(taskId: string) {
  return await taskade.tasks.delete(taskId);
}
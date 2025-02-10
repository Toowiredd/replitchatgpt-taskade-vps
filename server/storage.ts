import { users, workspaces, projects, tasks } from "@shared/schema";
import type { InsertUser, User, Workspace, Project, Task, SSHConfig } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { Client, type ClientChannel } from "ssh2";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Workspace operations
  getWorkspaces(userId: number): Promise<Workspace[]>;
  createWorkspace(name: string, userId: number): Promise<Workspace>;

  // Project operations
  getProjects(workspaceId: number): Promise<Project[]>;
  createProject(name: string, workspaceId: number): Promise<Project>;

  // Task operations
  getTasks(projectId: number): Promise<Task[]>;
  createTask(title: string, projectId: number): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  sessionStore: session.Store;

  // SSH methods
  saveSSHConfig(userId: number, config: SSHConfig): Promise<void>;
  getSSHConfig(userId: number): Promise<SSHConfig | null>;
  executeSSHCommand(config: SSHConfig, command: string): Promise<{ stdout: string; stderr: string }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workspaces: Map<number, Workspace>;
  private projects: Map<number, Project>;
  private tasks: Map<number, Task>;
  private currentIds: { [key: string]: number };
  sessionStore: session.Store;
  private sshConfigs: Map<number, SSHConfig>;

  constructor() {
    this.users = new Map();
    this.workspaces = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.currentIds = { users: 1, workspaces: 1, projects: 1, tasks: 1 };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.sshConfigs = new Map();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getWorkspaces(userId: number): Promise<Workspace[]> {
    return Array.from(this.workspaces.values()).filter(
      (workspace) => workspace.userId === userId,
    );
  }

  async createWorkspace(name: string, userId: number): Promise<Workspace> {
    const id = this.currentIds.workspaces++;
    const workspace: Workspace = {
      id,
      name,
      userId,
      createdAt: new Date(),
    };
    this.workspaces.set(id, workspace);
    return workspace;
  }

  async getProjects(workspaceId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.workspaceId === workspaceId,
    );
  }

  async createProject(name: string, workspaceId: number): Promise<Project> {
    const id = this.currentIds.projects++;
    const project: Project = {
      id,
      name,
      workspaceId,
      createdAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async getTasks(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId,
    );
  }

  async createTask(title: string, projectId: number): Promise<Task> {
    const id = this.currentIds.tasks++;
    const task: Task = {
      id,
      title,
      projectId,
      completed: false,
      createdAt: new Date(),
      assignedTo: null,
      metadata: null,
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error("Task not found");
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  async saveSSHConfig(userId: number, config: SSHConfig): Promise<void> {
    this.sshConfigs.set(userId, config);
  }

  async getSSHConfig(userId: number): Promise<SSHConfig | null> {
    return this.sshConfigs.get(userId) || null;
  }

  async executeSSHCommand(
    config: SSHConfig,
    command: string
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const client = new Client();

      client.on('ready', () => {
        client.exec(command, (err: Error | undefined, stream: ClientChannel) => {
          if (err) {
            client.end();
            reject(err);
            return;
          }

          let stdout = '';
          let stderr = '';

          stream
            .on('close', () => {
              client.end();
              resolve({ stdout, stderr });
            })
            .on('data', (data: Buffer) => {
              stdout += data.toString();
            })
            .stderr.on('data', (data: Buffer) => {
              stderr += data.toString();
            });
        });
      }).connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
      });
    });
  }
}

export const storage = new MemStorage();
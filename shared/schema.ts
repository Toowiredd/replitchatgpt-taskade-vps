import { pgTable, text, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: serial("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  workspaceId: serial("workspace_id").references(() => workspaces.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(), 
  title: text("title").notNull(),
  completed: boolean("completed").default(false),
  projectId: serial("project_id").references(() => projects.id),
  assignedTo: serial("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
  priority: text("priority"), // Added priority field
  dueDate: timestamp("due_date"), // Added due date field

});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).pick({
  name: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  workspaceId: true,
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  projectId: true,
  assignedTo: true,
  priority: true,
  dueDate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;

// Add SSH configuration schema
export const sshConfigSchema = z.object({
  host: z.string(),
  port: z.number().default(22),
  username: z.string(),
  privateKey: z.string(),
  passphrase: z.string().optional(),
});

export type SSHConfig = z.infer<typeof sshConfigSchema>;

// Add SSH config to user settings
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  sshConfig: jsonb("ssh_config"),
});

export interface Task {
  id: number;
  title: string;
  projectId: number;
  completed: boolean;
  createdAt: Date;
  assignedTo: number | null;
  metadata: Record<string, any> | null;
  priority: string | null; //Added priority
  dueDate: Date | null; //Added due date

}

export interface Comment {
  id: number;
  content: string;
  taskId: number;
  userId: number;
  createdAt: Date;
}

export interface List {
  id: number;
  name: string;
  projectId: number;
  createdAt: Date;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  action: string;
  parameters: Record<string, any>;
  result: any;
  startedAt: Date;
  completedAt?: Date;
}
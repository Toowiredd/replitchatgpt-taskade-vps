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
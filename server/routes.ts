import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { sshConfigSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Workspace routes
  app.get("/api/workspaces", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const workspaces = await storage.getWorkspaces(req.user.id);
    res.json(workspaces);
  });

  app.post("/api/workspaces", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const workspace = await storage.createWorkspace(req.body.name, req.user.id);
    res.json(workspace);
  });

  // Project routes
  app.get("/api/workspaces/:workspaceId/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const projects = await storage.getProjects(parseInt(req.params.workspaceId));
    res.json(projects);
  });

  app.post("/api/workspaces/:workspaceId/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const project = await storage.createProject(
      req.body.name,
      parseInt(req.params.workspaceId)
    );
    res.json(project);
  });

  // Task routes
  app.get("/api/projects/:projectId/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tasks = await storage.getTasks(parseInt(req.params.projectId));
    res.json(tasks);
  });

  app.post("/api/projects/:projectId/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const task = await storage.createTask(
      req.body.title,
      parseInt(req.params.projectId)
    );
    res.json(task);
  });

  app.patch("/api/tasks/:taskId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const task = await storage.updateTask(
      parseInt(req.params.taskId),
      req.body
    );
    res.json(task);
  });

  app.delete("/api/tasks/:taskId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteTask(parseInt(req.params.taskId));
    res.sendStatus(204);
  });

  // SSH routes
  app.post("/api/ssh/connect", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const config = sshConfigSchema.parse(req.body);
      await storage.saveSSHConfig(req.user.id, config);
      res.sendStatus(200);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/ssh/execute", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { command } = req.body;
      if (!command) {
        return res.status(400).json({ message: "Command is required" });
      }

      const sshConfig = await storage.getSSHConfig(req.user.id);
      if (!sshConfig) {
        return res.status(400).json({ message: "SSH configuration not found" });
      }

      const result = await storage.executeSSHCommand(sshConfig, command);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
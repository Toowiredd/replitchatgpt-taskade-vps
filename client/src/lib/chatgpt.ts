
import { ChatGPTClient } from 'openai';
import { SSHManager, getSSHInstance } from './ssh';
import * as taskade from './taskade';

export interface ChatGPTConfig {
  endpoint: string;
  apiKey?: string;
  capabilities: {
    taskade: boolean;
    ssh: boolean;
  };
}

export class EnhancedChatGPTClient {
  private config: ChatGPTConfig;
  private client: ChatGPTClient;

  constructor(config: ChatGPTConfig) {
    this.config = config;
    this.client = new ChatGPTClient({
      apiKey: config.apiKey,
    });
  }

  async connect(config: ChatGPTConfig) {
    this.config = config;
  }

  async executeTaskadeCommand(command: string, params: any) {
    if (!this.config.capabilities.taskade) {
      throw new Error('Taskade capability not enabled');
    }
    
    switch (command) {
      case 'createWorkspace':
        return taskade.createWorkspace(params.name, params.settings);
      case 'createProject':
        return taskade.createProject(params.workspaceId, params.name, params.template);
      case 'createTask':
        return taskade.createTask(params.projectId, params.title, params.options);
      case 'executeAgentAction':
        return taskade.executeAgentAction(params.agentId, params.action, params.parameters);
      default:
        throw new Error(`Unknown Taskade command: ${command}`);
    }
  }

  async executeSSHCommand(command: string) {
    if (!this.config.capabilities.ssh) {
      throw new Error('SSH capability not enabled');
    }
    
    const ssh = getSSHInstance();
    if (!ssh) {
      throw new Error('SSH not connected');
    }
    
    return ssh.executeCommand(command);
  }

  async chat(message: string, context?: {
    taskade?: boolean;
    ssh?: boolean;
  }) {
    try {
      // Process commands if they match specific patterns
      if (message.startsWith('/taskade ') && this.config.capabilities.taskade) {
        const [_, command, ...args] = message.split(' ');
        return this.executeTaskadeCommand(command, JSON.parse(args.join(' ')));
      }
      
      if (message.startsWith('/ssh ') && this.config.capabilities.ssh) {
        const command = message.slice(5);
        return this.executeSSHCommand(command);
      }

      // Regular chat if no special commands
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({ 
          message,
          context: {
            canUseTaskade: this.config.capabilities.taskade,
            canUseSSH: this.config.capabilities.ssh
          }
        })
      });
      
      return response.json();
    } catch (error) {
      console.error('ChatGPT error:', error);
      throw error;
    }
  }
}

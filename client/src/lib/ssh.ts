import { Client } from 'ssh2';
import { z } from 'zod';

// Schema for SSH connection config
export const sshConfigSchema = z.object({
  host: z.string(),
  port: z.number().default(22),
  username: z.string(),
  privateKey: z.string(),
  passphrase: z.string().optional(),
});

export type SSHConfig = z.infer<typeof sshConfigSchema>;

export class SSHManager {
  private client: Client;
  private config: SSHConfig;
  private isConnected: boolean = false;

  constructor(config: SSHConfig) {
    this.client = new Client();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client
        .on('ready', () => {
          this.isConnected = true;
          resolve();
        })
        .on('error', (err) => {
          this.isConnected = false;
          reject(err);
        })
        .connect({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          privateKey: this.config.privateKey,
          passphrase: this.config.passphrase,
        });
    });
  }

  async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    if (!this.isConnected) {
      throw new Error('Not connected to SSH server');
    }

    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream
          .on('close', () => {
            resolve({ stdout, stderr });
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  disconnect(): void {
    if (this.isConnected) {
      this.client.end();
      this.isConnected = false;
    }
  }
}

let sshInstance: SSHManager | null = null;

export async function initializeSSH(config: SSHConfig): Promise<SSHManager> {
  if (sshInstance) {
    sshInstance.disconnect();
  }
  
  sshInstance = new SSHManager(config);
  await sshInstance.connect();
  return sshInstance;
}

export function getSSHInstance(): SSHManager | null {
  return sshInstance;
}

import { z } from "zod";

// Define types for ChatGPT responses
export const chatGptResponseSchema = z.object({
  text: z.string(),
  conversationId: z.string().optional(),
  messageId: z.string().optional()
});

type ChatGPTResponse = z.infer<typeof chatGptResponseSchema>;

export class ChatGPTClient {
  private accessToken: string | null = null;
  private conversationId: string | null = null;

  constructor() {
    // Initialize with stored token if available
    this.accessToken = localStorage.getItem('chatgpt_token');
  }

  async authenticate(token: string) {
    this.accessToken = token;
    localStorage.setItem('chatgpt_token', token);
  }

  async analyzeTask(description: string): Promise<{
    title: string;
    priority: "low" | "medium" | "high";
    estimatedTime: string;
  }> {
    const prompt = `Please analyze this task and provide a JSON response with: title (a concise name), priority (low/medium/high), and estimatedTime. Task: ${description}`;
    const response = await this.sendMessage(prompt);
    try {
      return JSON.parse(response.text);
    } catch (error) {
      throw new Error("Failed to parse ChatGPT response");
    }
  }

  async suggestTaskBreakdown(task: string): Promise<string[]> {
    const prompt = `Break down this task into smaller subtasks and provide a JSON array of subtask descriptions. Task: ${task}`;
    const response = await this.sendMessage(prompt);
    try {
      const result = JSON.parse(response.text);
      return result.subtasks || [];
    } catch (error) {
      throw new Error("Failed to parse ChatGPT response");
    }
  }

  private async sendMessage(message: string): Promise<ChatGPTResponse> {
    if (!this.accessToken) {
      throw new Error("Not authenticated with ChatGPT");
    }

    const response = await fetch('https://chat.openai.com/api/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({
        message,
        conversation_id: this.conversationId,
        action: "next"
      })
    });

    if (!response.ok) {
      throw new Error("Failed to communicate with ChatGPT");
    }

    const data = await response.json();
    this.conversationId = data.conversation_id || this.conversationId;

    return chatGptResponseSchema.parse({
      text: data.message.content.parts[0],
      conversationId: data.conversation_id,
      messageId: data.message.id
    });
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  logout() {
    this.accessToken = null;
    this.conversationId = null;
    localStorage.removeItem('chatgpt_token');
  }
}

// Create a singleton instance
export const chatGPT = new ChatGPTClient();

import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

export async function analyzeTaskDescription(text: string): Promise<{
  title: string;
  priority: "low" | "medium" | "high";
  estimatedTime: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a task analysis expert. Analyze the given task description and provide a concise title, priority level, and estimated time. Response format: { 'title': string, 'priority': 'low'|'medium'|'high', 'estimatedTime': string }",
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    if (!response.choices[0].message.content) {
      throw new Error("No response content");
    }

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    const err = error as Error;
    throw new Error("Failed to analyze task: " + err.message);
  }
}

export async function suggestTaskBreakdown(task: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a task management expert. Break down the given task into smaller, manageable subtasks. Provide a JSON array of subtask descriptions.",
        },
        {
          role: "user",
          content: task,
        },
      ],
      response_format: { type: "json_object" },
    });

    if (!response.choices[0].message.content) {
      throw new Error("No response content");
    }

    const result = JSON.parse(response.choices[0].message.content);
    return result.subtasks;
  } catch (error) {
    const err = error as Error;
    throw new Error("Failed to generate task breakdown: " + err.message);
  }
}
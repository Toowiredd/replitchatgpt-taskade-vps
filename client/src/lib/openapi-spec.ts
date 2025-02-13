
export const openApiSpec = {
  openapi: "3.0.1",
  info: {
    title: "Custom GPT API",
    version: "1.0.0",
    description: "API specification for Custom GPT with Taskade and SSH control"
  },
  servers: [
    {
      url: "/api"
    }
  ],
  paths: {
    "/chat": {
      post: {
        summary: "Send a chat message",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string"
                  },
                  context: {
                    type: "object",
                    properties: {
                      taskade: {
                        type: "boolean"
                      },
                      ssh: {
                        type: "boolean"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Chat response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    response: {
                      type: "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/taskade/execute": {
      post: {
        summary: "Execute Taskade command",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  command: {
                    type: "string"
                  },
                  params: {
                    type: "object"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

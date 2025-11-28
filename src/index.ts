#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// TypeScript interfaces for KURA API responses
interface KuraSearchResult {
  id: string;
  title: string | null;
  excerpt: string;
  contentType: string;
  relevanceScore: number;
  metadata: {
    tags: string[];
    createdAt: string;
    updatedAt: string;
    source: string | null;
    annotation: string | null;
  };
}

interface KuraContent {
  id: string;
  content: string;
  contentType: string;
  metadata: {
    title: string | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    source: string | null;
    annotation: string | null;
  };
}

interface KuraCaptureRequest {
  content: string;
  contentType: "text";
  metadata?: {
    title?: string;
    tags?: string[];
    annotation?: string;
  };
}

// Environment variables validation
const API_KEY = process.env.API_KEY;
const KURA_API_URL = process.env.KURA_API_URL || "https://kura.tillmaessen.de";

if (!API_KEY) {
  console.error("[KURA MCP] ERROR: API_KEY environment variable is required");
  process.exit(1);
}

console.error(`[KURA MCP] Initializing with API URL: ${KURA_API_URL}`);
console.error(`[KURA MCP] API_KEY present: ${API_KEY ? 'yes' : 'no'}, length: ${API_KEY?.length || 0} chars`);

// Helper function to call KURA API
async function callKuraAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${KURA_API_URL}${endpoint}`;
  const authHeader = `Bearer ${API_KEY}`;

  console.error(`[KURA MCP] API call: ${options.method || "GET"} ${url}`);
  console.error(`[KURA MCP] Auth header format: Bearer ${API_KEY?.substring(0, 8)}...`);

  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  console.error(`[KURA MCP] API response: ${response.status} ${response.statusText}`);

  return response;
}

// Initialize MCP server
const server = new Server(
  {
    name: "kura-mcp-client",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: "kura_search",
    description: "Perform semantic search across KURA Notes. Returns relevant notes based on the query with metadata.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query for semantic search",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
        contentType: {
          type: "string",
          description: "Filter by content type (e.g., 'text')",
        },
        tags: {
          type: "string",
          description: "Comma-separated tags to filter by",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "kura_create",
    description: "Create a new text note in KURA Notes. Use this to capture ideas, information, or any text content.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The main content of the note",
        },
        title: {
          type: "string",
          description: "Optional title for the note",
        },
        annotation: {
          type: "string",
          description: "Optional annotation or additional context",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional array of tags to categorize the note",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "kura_get",
    description: "Retrieve a specific note by its ID. Returns the full content and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique identifier of the note",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "kura_list_recent",
    description: "List the 20 most recent notes with their metadata (without full content). Use this to get an overview of recent activity.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "kura_delete",
    description: "Delete a note by its ID. This action is permanent and cannot be undone.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique identifier of the note to delete",
        },
      },
      required: ["id"],
    },
  },
];

// Handle ListTools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("[KURA MCP] Listing available tools");
  return { tools };
});

// Handle CallTool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[KURA MCP] Tool called: ${name} with args:`, JSON.stringify(args));

  try {
    switch (name) {
      case "kura_search": {
        const { query, limit = 10, contentType, tags } = args as {
          query: string;
          limit?: number;
          contentType?: string;
          tags?: string;
        };

        // Build query parameters
        const params = new URLSearchParams({
          query,
          limit: limit.toString(),
        });

        if (contentType) {
          params.append("contentType", contentType);
        }

        if (tags) {
          params.append("tags", tags);
        }

        const response = await callKuraAPI(`/api/search?${params.toString()}`);

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text",
                text: `Error searching notes: ${response.status} ${response.statusText}\n${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const results = await response.json() as KuraSearchResult[];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "kura_create": {
        const { content, title, annotation, tags } = args as {
          content: string;
          title?: string;
          annotation?: string;
          tags?: string[];
        };

        const requestBody: KuraCaptureRequest = {
          content,
          contentType: "text",
        };

        if (title || annotation || tags) {
          requestBody.metadata = {};
          if (title) requestBody.metadata.title = title;
          if (annotation) requestBody.metadata.annotation = annotation;
          if (tags) requestBody.metadata.tags = tags;
        }

        const response = await callKuraAPI("/api/capture", {
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text",
                text: `Error creating note: ${response.status} ${response.statusText}\n${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const result = await response.json();

        return {
          content: [
            {
              type: "text",
              text: `Note created successfully!\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case "kura_get": {
        const { id } = args as { id: string };

        const response = await callKuraAPI(`/api/content/${id}`);

        if (response.status === 404) {
          return {
            content: [
              {
                type: "text",
                text: `Note with ID "${id}" not found.`,
              },
            ],
            isError: true,
          };
        }

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text",
                text: `Error retrieving note: ${response.status} ${response.statusText}\n${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const note = await response.json() as KuraContent;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(note, null, 2),
            },
          ],
        };
      }

      case "kura_list_recent": {
        const response = await callKuraAPI("/api/content/recent");

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text",
                text: `Error listing recent notes: ${response.status} ${response.statusText}\n${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const notes = await response.json();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(notes, null, 2),
            },
          ],
        };
      }

      case "kura_delete": {
        const { id } = args as { id: string };

        const response = await callKuraAPI(`/api/content/${id}`, {
          method: "DELETE",
        });

        if (response.status === 404) {
          return {
            content: [
              {
                type: "text",
                text: `Note with ID "${id}" not found.`,
              },
            ],
            isError: true,
          };
        }

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text",
                text: `Error deleting note: ${response.status} ${response.statusText}\n${errorText}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Note with ID "${id}" deleted successfully.`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    console.error(`[KURA MCP] Error executing tool ${name}:`, error);

    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  console.error("[KURA MCP] Starting MCP server with stdio transport");

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[KURA MCP] Server running and ready to accept requests");
}

main().catch((error) => {
  console.error("[KURA MCP] Fatal error:", error);
  process.exit(1);
});

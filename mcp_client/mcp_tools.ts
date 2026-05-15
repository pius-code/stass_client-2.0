import { connectMCPClient, mcp_client, reconnectMCPClient } from "../core/fastmcp";

export type GroqTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, any>;
  strict: boolean;
};

async function listToolsWithRetry() {
  try {
    return await mcp_client.listTools();
  } catch (error: any) {
    if (error?.code === 404) {
      await reconnectMCPClient();
      return await mcp_client.listTools();
    }
    throw error;
  }
}

export async function get_tools(): Promise<GroqTool[]> {
  // this is for openAI response endpoint
  await connectMCPClient();
  const tool_result = await listToolsWithRetry();
  return tool_result.tools.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description ?? "",
    parameters: tool.inputSchema,
    strict: false,
  }));
}

export async function get_tools_2(): Promise<any[]> {
  // this one uses raw openAI chat.completions endpoint
  await connectMCPClient();
  const tool_result = await listToolsWithRetry();
  return tool_result.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema,
    },
  }));
}

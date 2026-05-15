import { mcp_client, reconnectMCPClient } from "../core/fastmcp";

export const tool_call_result = async (
  toolName: string,
  args: Record<string, unknown>,
) => {
  try {
    return await mcp_client.callTool({ name: toolName, arguments: args });
  } catch (error: any) {
    if (error?.code === 404) {
      await reconnectMCPClient();
      return await mcp_client.callTool({ name: toolName, arguments: args });
    }
    console.error(`Error occurred while calling tool ${toolName}:`, error);
    throw error;
  }
};

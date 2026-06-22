// client_tools.ts - raw tools defined locally in STASS
import { GroqTool } from "../mcp_client/mcp_tools";

export const clientTools: GroqTool[] = [
  {
    type: "function",
    name: "create_scheduled_agent_task",
    description:
      "Schedule the agent to run a task at a specific time. " +
      "Use when user says 'remind me', 'send me a report at X time', 'check on the drugs at 9pm'. " +
      "Example: 'send me a drug report at 9pm' → call with cron='0 21 * * *', task='generate full drug viability report and send to user'",
    parameters: {
      type: "object",
      properties: {
        cron: {
          type: "string",
          description:
            "Cron expression for when to run. e.g. '0 21 * * *' for 9pm daily",
        },
        task: {
          type: "string",
          description:
            "Description of what the agent should do at the scheduled time",
        },
      },
      required: ["cron", "task"],
    },
    strict: false,
  },
];

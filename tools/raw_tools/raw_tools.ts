import { scheduleSchema } from "../../types/types";
import cron, { type ScheduledTask } from "node-cron";

// for now it doesnt persist in a database, jobs will be destroyed upon restart
const cron_map: Record<string, ScheduledTask> = {};

export async function callAgentToWork(prompt: string) {
  // an api call
}

export async function createScheduledAgentTask(ScheduleSchema: scheduleSchema) {
  const cronJob = cron.schedule(ScheduleSchema.cron_expression, () =>
    callAgentToWork(ScheduleSchema.prompt),
  );

  cron_map[ScheduleSchema.workflow_id] = cronJob;
}

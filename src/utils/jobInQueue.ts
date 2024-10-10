import { imageQueue } from "@routes/image";

export default async function GetJobIndexInQueue(
  queueId: string | null | undefined
): Promise<number | null> {
  if (!queueId) return null;
  const job = await imageQueue.getJob(queueId as string);

  // Optionally, get all jobs in the 'waiting' state to determine position
  const waitingJobs = await imageQueue.getWaiting();

  // Find the index of the specific job in the waiting queue
  const jobIndex = waitingJobs.findIndex(
    (waitingJob) => waitingJob.id === job?.id
  );

  return !jobIndex ? 0 : jobIndex >= 0 ? jobIndex + 1 : 0;
}

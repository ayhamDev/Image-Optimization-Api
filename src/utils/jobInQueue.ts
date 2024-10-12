import { imageQueue } from "@routes/image";
import { videoQueue } from "@routes/video";

export default async function GetJobIndexInQueue(
  queueName: "image-compression" | "video-compression",
  queueId: string | null | undefined
): Promise<number | null> {
  if (!queueId) return null;
  const job = await GetQueueByName(queueName).getJob(queueId as string);

  // Optionally, get all jobs in the 'waiting' state to determine position
  const waitingJobs = await GetQueueByName(queueName).getWaiting();

  // Find the index of the specific job in the waiting queue
  const jobIndex = waitingJobs.findIndex(
    (waitingJob) => waitingJob.id === job?.id
  );

  return !jobIndex ? 0 : jobIndex >= 0 ? jobIndex + 1 : 0;
}

function GetQueueByName(queueName: "image-compression" | "video-compression") {
  switch (queueName) {
    case "image-compression":
      return imageQueue;
    case "video-compression":
      return videoQueue;
  }
}

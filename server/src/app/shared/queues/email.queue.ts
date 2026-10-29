/**
 * Minimal email queue stub.
 * Replace with BullMQ (Redis) or SQS in production.
 *
 * Real implementation should:
 *  - Serialize jobs to Redis/SQS
 *  - Have a worker process that calls your email provider (SES / SendGrid / Resend)
 *  - Implement exponential backoff + dead-letter queue
 */
type Job = "verification" | "welcome" | "password-reset" | "habit-reminder";

interface EmailJob<T = Record<string, unknown>> {
  add(job: Job, payload: T): Promise<void>;
}

export const emailQueue: EmailJob = {
  async add(job, _payload) {
    console.log(`[emailQueue] enqueued "${job}"`);
    // TODO: replace with real queue
  },
};

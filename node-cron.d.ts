declare module 'node-cron' {
  interface ScheduledTask {
    stop(): void;
    start(): void;
  }
  
  function schedule(
    expression: string,
    func: Function,
    options?: {
      scheduled?: boolean;
      timezone?: string;
    }
  ): ScheduledTask;
  
  function validate(expression: string): boolean;
  
  export { schedule, validate, ScheduledTask };
}
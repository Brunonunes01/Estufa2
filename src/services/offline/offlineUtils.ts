export type QueueOptions = { syncMode?: 'allow_queue' | 'online_only' };

export const isOfflineLikeError = (error: any) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('network-request-failed') ||
    code.includes('timeout') ||
    code.includes('timedout') ||
    code.includes('failed_fetch') ||
    code.includes('fetch_error') ||
    message.includes('network request failed') ||
    message.includes('offline') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('network error') ||
    message.includes('networkerror') ||
    message.includes('connection error') ||
    message.includes('connection lost') ||
    message.includes('internet') ||
    message.includes('socket') ||
    message.includes('timeout') ||
    message.includes('timed out')
  );
};

export const shouldAllowQueue = (options?: QueueOptions) =>
  (options?.syncMode || 'allow_queue') !== 'online_only';

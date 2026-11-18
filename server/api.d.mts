import type { IncomingMessage, ServerResponse } from 'node:http';

export const TAMIL_VOICE: string;
export function createApi(env: Record<string, string | undefined>):
  (req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>;

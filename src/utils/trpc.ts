// file-path: chatgpt-clone-mobile/src/utils/trpc.ts


import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';
import path from 'path';

export const trpc = createTRPCReact<AppRouter>();

import { router } from './trpc';
import { exampleRouter } from './routers/example';
import { chatRouter } from './routers/chat';

export const appRouter = router({
  example: exampleRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;

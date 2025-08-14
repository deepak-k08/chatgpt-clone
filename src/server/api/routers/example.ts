// file-path: chatgpt-clone-mobile/src/server/api/routers/example.ts



import { publicProcedure, router } from '../trpc';
import { z } from 'zod';

export const exampleRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().nullish() }).nullish())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.name ?? "world"}`,
      };
    }),
});

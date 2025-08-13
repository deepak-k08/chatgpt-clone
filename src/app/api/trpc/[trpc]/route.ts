import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/api/root';

const handler = (req: Request) => {
  console.log('tRPC request received:', req.url);
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}), // add auth context later
  });
};


export { handler as GET, handler as POST };

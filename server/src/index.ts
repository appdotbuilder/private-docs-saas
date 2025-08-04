
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  registerInputSchema, 
  loginInputSchema,
  uploadDocumentInputSchema,
  searchDocumentsInputSchema,
  getUserDocumentsInputSchema,
  updateDocumentInputSchema,
  externalUploadInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { uploadDocument } from './handlers/upload_document';
import { searchDocuments } from './handlers/search_documents';
import { getUserDocuments } from './handlers/get_user_documents';
import { getDocument } from './handlers/get_document';
import { updateDocument } from './handlers/update_document';
import { deleteDocument } from './handlers/delete_document';
import { externalUpload } from './handlers/external_upload';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Mock authentication middleware - in real implementation, this would verify JWT tokens
const authenticatedProcedure = publicProcedure.use(({ next }) => {
  // This is a placeholder! Real implementation should:
  // 1. Extract JWT token from Authorization header
  // 2. Verify token validity
  // 3. Extract user ID from token
  // 4. Pass user ID to context
  const mockUserId = 1; // Placeholder user ID
  return next({
    ctx: { userId: mockUserId }
  });
});

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Document management routes (authenticated)
  uploadDocument: authenticatedProcedure
    .input(uploadDocumentInputSchema)
    .mutation(({ input, ctx }) => uploadDocument(input, ctx.userId)),

  searchDocuments: authenticatedProcedure
    .input(searchDocumentsInputSchema)
    .query(({ input, ctx }) => searchDocuments(input, ctx.userId)),

  getUserDocuments: authenticatedProcedure
    .input(getUserDocumentsInputSchema)
    .query(({ input, ctx }) => getUserDocuments(input, ctx.userId)),

  getDocument: authenticatedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) => getDocument(input.id, ctx.userId)),

  updateDocument: authenticatedProcedure
    .input(updateDocumentInputSchema)
    .mutation(({ input, ctx }) => updateDocument(input, ctx.userId)),

  deleteDocument: authenticatedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => deleteDocument(input.id, ctx.userId)),

  // External service routes (for services like scansioni.ch)
  externalUpload: publicProcedure
    .input(externalUploadInputSchema)
    .mutation(({ input }) => externalUpload(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();

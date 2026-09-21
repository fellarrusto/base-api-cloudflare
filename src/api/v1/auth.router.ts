import { createRoute } from '@hono/zod-openapi';
import { getBearerToken, withAuditLog, withAuth } from '../../middleware';
import { UserCreateSchema, UserSchema } from '../../schemas/user.schema';
import * as authService from '../../services/auth.service';
import { bearerSecurity, createRouter, errorResponses } from './openapi';

const authRouter = createRouter();

const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Auth'],
  description: 'Register the caller of an identity provider token as a new user',
  security: bearerSecurity,
  middleware: [withAuditLog('register', { metadata: { service: 'auth' } })],
  request: {
    body: { content: { 'application/json': { schema: UserCreateSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'User registered',
    },
    ...errorResponses(400, 401, 409, 422, 502),
  },
});

authRouter.openapi(registerRoute, async (c) => {
  const user = await authService.register(c.env, getBearerToken(c), c.req.valid('json'));
  return c.json(user, 201);
});

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Auth'],
  description: 'Current authenticated user',
  security: bearerSecurity,
  middleware: [withAuditLog('me', { metadata: { service: 'auth' } }), withAuth()],
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'Current user',
    },
    ...errorResponses(401, 502),
  },
});

authRouter.openapi(meRoute, (c) => {
  return c.json(c.get('currentUser'), 200);
});

export { authRouter };

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Env, AppVariables } from '../core/types';
import { withAuditLog, withAuth, withRole } from '../core/middleware';
import { UserSchema, UserCreateSchema, UserUpdateSchema } from '../models/user.model';
import { verifyToken } from '../services/auth.service';
import * as userService from '../services/user.service';

const authRouter = new OpenAPIHono<{ Bindings: Env; Variables: AppVariables }>();

const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Auth'],
  description: 'Register a new user from IDP token',
  request: {
    body: { content: { 'application/json': { schema: UserCreateSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'User registered',
    },
    401: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Missing or invalid Authorization header',
    },
    409: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'User already exists',
    },
  },
});

authRouter.use('/register', withAuditLog('register'));

authRouter.openapi(registerRoute, async (c) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const payload = await verifyToken(header.slice(7), {
    jwksUrl: c.env.AUTH_JWKS_URL,
    issuer: c.env.AUTH_ISSUER,
    audience: c.env.AUTH_AUDIENCE,
  });

  const existing = await userService.getBySubject(c.env.DB, payload.sub);
  if (existing) {
    return c.json({ error: 'User already registered' }, 409);
  }

  const input = c.req.valid('json');
  const user = await userService.create(c.env.DB, payload.sub, payload.email || '', input);
  return c.json(user, 201);
});

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Auth'],
  description: 'Get current authenticated user',
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'Current user',
    },
  },
});

authRouter.use('/me', withAuth(), withAuditLog('me'));

authRouter.openapi(meRoute, (c) => {
  return c.json(c.get('currentUser'), 200);
});

const updateUserRoute = createRoute({
  method: 'patch',
  path: '/users/{id}',
  tags: ['Users'],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: UserUpdateSchema } } },
  },
  responses: {
    200: { description: 'User updated' },
  },
});

authRouter.use('/users/*', withAuth(), withRole('user'), withAuditLog('updateUser'));

authRouter.openapi(updateUserRoute, async (c) => {
  const { id } = c.req.valid('param');
  const input = c.req.valid('json');
  await userService.update(c.env.DB, id, input);
  return c.json({ updated: true }, 200);
});

export { authRouter };
import { createRoute, z } from '@hono/zod-openapi';
import { withAuditLog, withAuth } from '../../middleware';
import { UserSchema, UserUpdateSchema } from '../../schemas/user.schema';
import * as userService from '../../services/user.service';
import { bearerSecurity, createRouter, errorResponses } from './openapi';

const userRouter = createRouter();

const updateUserRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Users'],
  description: 'Update the fields sent of a user. Requires role admin',
  security: bearerSecurity,
  middleware: [withAuditLog('updateUser', { metadata: { service: 'users' } }), withAuth('admin')],
  request: {
    params: z.object({ id: z.string().min(1) }),
    body: { content: { 'application/json': { schema: UserUpdateSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: UserSchema } },
      description: 'Updated user',
    },
    ...errorResponses(401, 403, 404, 422),
  },
});

userRouter.openapi(updateUserRoute, async (c) => {
  const { id } = c.req.valid('param');
  return c.json(await userService.update(c.env.DB, id, c.req.valid('json')), 200);
});

export { userRouter };

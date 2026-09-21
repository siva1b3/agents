import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createUserSchema } from '../schemas/user.js';
import { createUser, getUser } from '../controllers/users.js';

export const usersRouter = Router();

usersRouter.post('/', validate(createUserSchema), createUser);
usersRouter.get('/:id', getUser);

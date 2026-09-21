import * as users from '../services/users.js';

export function createUser(req, res) {
  res.status(201).json(users.createUser(req.validatedBody));
}

export function getUser(req, res) {
  res.json(users.findUser(req.params.id));
}

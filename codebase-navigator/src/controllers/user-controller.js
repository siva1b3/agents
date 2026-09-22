export function createUserController({ userService }) {
  return {
    getProfile(request, response) {
      response.json({ data: request.authenticatedUser });
    },
    updateProfile(request, response) {
      response.json({ data: userService.updateProfile(
        request.authenticatedUser.id, request.validated.body, request.requestId,
      ) });
    },
    async changePassword(request, response) {
      await userService.changePassword(request.authenticatedUser.id, request.validated.body, request.requestId);
      response.status(204).end();
    },
    async deactivateAccount(request, response) {
      await userService.deactivateAccount(
        request.authenticatedUser.id, request.validated.body.password, request.requestId,
      );
      response.status(204).end();
    },
  };
}

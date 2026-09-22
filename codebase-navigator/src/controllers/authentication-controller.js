export function createAuthenticationController({ userService, authenticationService }) {
  return {
    async register(request, response) {
      const user = await userService.registerUser(request.validated.body, request.requestId);
      response.status(201).json({ data: user });
    },
    async login(request, response) {
      const session = await authenticationService.login(request.validated.body, request.requestId);
      response.json({ data: session });
    },
    logout(request, response) {
      authenticationService.logout(request.sessionTokenHash, request.authenticatedUser.id, request.requestId);
      response.status(204).end();
    },
    logoutAll(request, response) {
      authenticationService.logoutAll(request.authenticatedUser.id, request.requestId);
      response.status(204).end();
    },
  };
}

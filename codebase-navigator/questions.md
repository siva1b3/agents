# Investigation questions

1. Where does request validation happen, and how are invalid requests rejected?
2. Which fields are required when creating a user? Are extra fields accepted?
3. How does malformed JSON get rejected?
4. Where are users stored, and do they survive an application restart?
5. What happens when a requested user does not exist?
6. What limits the request body size?
7. Where is the server port configured?
8. Which endpoints require authentication, and how is a user identified?
9. Where is insufficient stock rejected, and how does the error reach the client?
10. Can a failed multi-product order reduce inventory?
11. How are duplicate product lines rejected?
12. How is an order total calculated, and what currency unit is used?
13. Can one user read or cancel another user's order?
14. What happens to inventory when an order is cancelled twice?
15. How are duplicate email addresses detected regardless of letter case?
16. How does listing orders avoid returning another user's orders?

For each answer, cite repository file paths and line numbers.

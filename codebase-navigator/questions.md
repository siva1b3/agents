# Investigation questions

Ask the navigator to cite repository paths, function names and current line
numbers. Require it to distinguish what the code proves from what it assumes.
Do not provide the evaluator guide as part of the initial investigation prompt.

## Start here

1. Find where request validation happens and explain how invalid requests are rejected.
2. Trace POST /api/v1/orders from its route to inventory mutation and response.
3. Where is the Express application created, and where does it start listening?
4. What determines middleware execution order?
5. Which endpoints are public and which require authentication?

## Authentication and account safety

6. How are passwords hashed, and why aren't tokens hashed the same way?
7. Where does a bearer token become an authenticated user?
8. What happens when a session expires?
9. Explain the difference between logout and logout-all.
10. How does a password change invalidate old sessions?
11. Can registration create an administrator? Cite both the schema and service.
12. What prevents concurrent registrations from creating duplicate emails?
13. What prevents concurrent password changes from overwriting each other?
14. How are password hashes excluded from API responses?
15. How does login handle nonexistent and inactive accounts?
16. What happens to existing orders when a customer deactivates their account?

## Permissions and catalog

17. Where are administrator permissions defined and enforced?
18. Can one customer view or cancel another customer's order?
19. How do product filtering, sorting and pagination work?
20. What prevents a stale product update from overwriting a newer change?
21. Does placing an order change the product version? Why does that matter?
22. What is the difference between archiving and physically deleting a product?
23. Where are stock adjustments validated and audited?

## Orders and failure cases

24. If the second requested product has insufficient stock, is the first product's stock changed?
25. How are duplicate product lines rejected?
26. Can two simultaneous requests buy the final unit?
27. Why does changing a product's price not change an existing order total?
28. What happens if an order request is retried with the same idempotency key?
29. What happens if that key is reused with different items or by another customer?
30. After an order is cancelled, does a replay return the original or current order status?
31. What changes after the idempotency record expires?
32. Which order status transitions are legal, and who can trigger them?
33. Can repeated cancellation restore inventory twice?
34. Can an order containing an archived product still be cancelled?
35. When can inventory capacity prevent cancellation, and is that failure atomic?

## Infrastructure and operational behavior

36. Where are malformed JSON and oversized bodies translated into API errors?
37. Which error details are hidden from clients?
38. How can a response be correlated with a log and audit event?
39. Which fields are deliberately excluded from request logs?
40. What are the two rate limits, and can a forwarded IP header bypass them?
41. Does CORS replace authentication? What does this implementation actually check?
42. What is the difference between liveness and readiness in this code?
43. What happens after SIGTERM, including the shutdown deadline?
44. How are environment values validated before startup?
45. How are demo accounts created, and why does production-mode seeding fail?
46. Which records are bounded, lazily expired, or retained indefinitely?
47. Why are these inventory operations safe from request interleaving in one process,
    but not a replacement for a database transaction?
48. Which tests demonstrate ownership, concurrency, idempotency and session revocation?

## Questions where the answer should acknowledge absence

49. Which database tables or migrations store orders?
50. Where are payment requests sent?
51. How are password-reset emails delivered?
52. Where is the Codebase Navigator Agent implemented?

A correct answer to an absent-feature question should say it is absent, cite
relevant code and scope documentation, and avoid inventing an integration.

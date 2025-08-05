# Basic Express Template Guide

This guide provides a brief overview of the basic Express.js template structure and where to add your code.

## Project Structure

```
.
├── src/
│   ├── utils/
│   │   ├── api-response.ts
│   │   ├── env.ts
│   │   └── try-catch.ts
│   └── index.ts
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── ...
```

## File Breakdown and Usage

-   **`src/index.ts`**:
    -   This is the main entry point of your Express application.
    -   It sets up the Express server, defines basic routes (like the root `/` route), and starts listening for incoming requests.
    -   **Where to add code**: For simple applications, you can add more routes directly in this file. For more complex logic, consider creating separate route files and importing them here.

-   **`src/utils/`**:
    -   This directory is for utility functions and helper modules that can be reused across your application.
    -   **`api-response.ts`**: Contains helper functions for consistent API response formatting (e.g., success, error responses).
        -   **Where to add code**: If you need custom response formats, modify or extend functions in this file.
    -   **`env.ts`**: Handles environment variable loading and validation using `@t3-oss/env-core`.
        -   **Where to add code**: Define your application's environment variables and their validation schemas here.
    -   **`try-catch.ts`**: A utility for wrapping asynchronous Express route handlers to simplify error handling.
        -   **Where to add code**: Use this wrapper around your async route handlers to automatically catch errors and pass them to the Express error middleware.

## Getting Started

1.  **Define Environment Variables**: Update `.env` with your application's configuration.
2.  **Add Routes**: For new API endpoints, you can add them directly in `src/index.ts` or create new route files and import them.
3.  **Implement Logic**: Write your business logic within your route handlers or in separate service files if your application grows.
4.  **Utilize Utilities**: Make use of the `api-response`, `env`, and `try-catch` utilities to maintain consistency and robustness.

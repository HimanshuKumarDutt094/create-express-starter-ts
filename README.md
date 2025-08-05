# create-express-starter

`create-express-starter` is a command-line interface (CLI) tool that helps you quickly set up a new Express.js project. It provides options to generate either a basic Express application or an advanced Express application with a more comprehensive structure, including API versioning, controllers, routes, schemas, and utilities.

## Features

- **Basic Express Setup**: A minimal Express.js application with essential configurations.
- **Advance Express Setup**: A more feature-rich Express.js application with a structured API, including:
  - API versioning (`/api/v1`)
  - Controllers, Routes, and Schemas
  - Utility functions (e.g., `api-response`, `try-catch`, `env`)
  - OpenAPI documentation setup
  - Drizzle ORM integration (schema and config)
- **Git Initialization**: Option to initialize a Git repository.
- **Dependency Installation**: Option to install project dependencies using your preferred package manager (npm, yarn, pnpm, or bun).

## Technologies Used

### Core Technologies (Both Basic and Advance Templates)

- **Express.js**: Fast, unopinionated, minimalist web framework for Node.js.
- **TypeScript**: Superset of JavaScript that adds static typing.
- **Zod**: TypeScript-first schema declaration and validation library. Used for robust data validation.
- **`@t3-oss/env-core`**: Type-safe environment variable parsing and validation.
- **`dotenv-cli`**: Loads environment variables from `.env` files.
- **`tsx`**: Instantly run TypeScript files without precompilation.
- **`tsc-alias`**: Resolves TypeScript path aliases in compiled JavaScript.
- **ESLint & Prettier**: Code linting and formatting for consistent code style.

### Advance Template Specific Technologies

- **Helmet**: Helps secure Express apps by setting various HTTP headers.
- **Swagger UI Express**: Serves auto-generated API documentation via Swagger UI.
- **`@asteasolutions/zod-to-openapi`**: Generates OpenAPI 3.x documentation from Zod schemas and Express routes.
- **Drizzle ORM**: A modern TypeScript ORM for SQL databases.
- **Drizzle Kit**: CLI tool for Drizzle ORM, used for migrations and schema management.
- **Better SQLite3**: A fast and simple SQLite3 library for Node.js, used as the database driver for Drizzle ORM in the advance template.
- **`cors`**: Middleware to enable Cross-Origin Resource Sharing.
- **`zod-express-middleware`**: Integrates Zod validation with Express middleware for request validation.

## Installation

To use `create-express-starter`, you can clone this repository and run the CLI directly.

```bash
git clone https://github.com/HimanshuKumarDutt094/create-express-starter-ts.git
cd create-express-starter-ts
pnpm install # or npm install, yarn install, bun install
```

## Usage

To create a new Express project, run the CLI from the root of this repository:

```bash
pnpm ts-node src/index.ts
```

The CLI will prompt you for the following information:

1.  **Project Directory**: Where you would like to create your new project (e.g., `.` for the current directory, or a new directory name like `my-express-app`).
2.  **Express Setup Type**: Choose between "Basic Express Setup" and "Advance Express Setup".
3.  **Initialize Git Repository**: Confirm if you want to initialize a Git repository in your new project.
4.  **Install Dependencies**: Confirm if you want to install dependencies for your new project.

### Example

```bash
$ pnpm ts-node src/index.ts

? Where would you like to create your project? › my-express-app
? Which Express setup would you like? › Basic Express Setup
? Would you like to initialize a git repository? › Yes
? Would you like to install dependencies? › Yes

# ... CLI output for project creation, git init, and dependency installation ...

Project created successfully! 🎉

Next steps:
  cd my-express-app
  pnpm run dev
```

## Project Structure (Advance Express Setup)

The "Advance Express Setup" provides a robust structure for scalable Express applications:

```
.
├── src/
│   ├── api/
│   │   └── v1/
│   │       ├── controllers/
│   │       │   ├── health.controller.ts
│   │       │   └── user.controller.ts
│   │       ├── docs/
│   │       │   └── openapi.ts
│   │       ├── routes/
│   │       │   ├── health.routes.ts
│   │       │   └── user.route.ts
│   │       ├── schemas/
│   │       │   └── user.schema.ts
│   │       └── validators/
│   │           └── user.validators.ts
│   ├── drizzle/
│   │   ├── drizle.config.ts
│   │   └── src/
│   │       ├── db/
│   │       │   └── schema.ts
│   │       └── index.ts
│   ├── utils/
│   │   ├── api-response.ts
│   │   ├── env.ts
│   │   ├── openapiRegistry.ts
│   │   └── try-catch.ts
│   ├── index.ts
│   └── zod-extend.ts
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── ...
```

## OpenAPI Documentation with Zod

The "Advance Express Setup" includes comprehensive OpenAPI (Swagger) documentation generated using `zod-to-openapi`. This integration ensures that your API documentation is always in sync with your Zod schemas, providing type-safe and accurate specifications for your endpoints.

**Key Features:**

- **Automatic Schema Generation**: Zod schemas defined for request bodies, query parameters, and response payloads are automatically converted into OpenAPI schema objects.
- **Route Definition**: API routes are registered with the OpenAPI registry, including their methods, paths, summaries, descriptions, and associated schemas.
- **Swagger UI**: The generated OpenAPI document is served via Swagger UI, providing an interactive interface to explore and test your API endpoints.
- **Type Safety**: Leverage the power of Zod for runtime validation and TypeScript for compile-time type checking, ensuring your API adheres to its defined contracts.

**Relevant Files:**

- `src/api/v1/docs/openapi.ts`: Configures the OpenAPI document, including API info, servers, and security schemes. It imports and registers all necessary routes and schemas.
- `src/utils/openapiRegistry.ts`: A shared registry instance used to collect all OpenAPI definitions (paths, schemas, components) from various parts of your application.
- `src/api/v1/routes/*.ts`: API route files where endpoints are defined and registered with the OpenAPI registry using `registry.registerPath()`.
- `src/api/v1/schemas/*.ts`: Zod schema files that define the structure of your request and response data. These schemas are automatically picked up by `zod-to-openapi`.
- `src/middlewares/swaggerMiddleware.ts`: Handles serving the OpenAPI JSON and setting up Swagger UI.
- `src/docs/docs.route.ts`: Defines the routes for accessing the Swagger UI documentation.

To view the API documentation, start your advanced Express application and navigate to `http://localhost:3000/docs/v1` (assuming default port 3000).

## Development

To develop `create-express-starter` itself:

```bash
pnpm dev # Starts TypeScript in watch mode
```

## Building

To build the CLI for distribution:

```bash
pnpm build
```

This will compile the TypeScript code to JavaScript and copy the `templates` directory into the `dist` folder.

## License

This project is licensed under the MIT License.

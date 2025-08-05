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

## Installation

To use `create-express-starter`, you can clone this repository and run the CLI directly.

```bash
git clone https://github.com/HimanshuKumarDutt094/create-exress-starter.git
cd create-exress-starter
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

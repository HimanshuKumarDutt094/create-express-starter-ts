#!/usr/bin/env node

import { confirm, intro, outro, select, spinner, text } from "@clack/prompts";
import consola from "consola";
import { execa } from "execa";
import fs from "fs-extra";
import { pastel } from "gradient-string";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let TEMPLATE_DIR: string;

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export async function detectPackageManager(): Promise<PackageManager> {
  // 1. Check environment variable
  const userAgent = process.env.npm_config_user_agent || "";
  if (userAgent.includes("pnpm")) return "pnpm";
  if (userAgent.includes("yarn")) return "yarn";
  if (userAgent.includes("bun")) return "bun";

  // 2. Fallback to lockfile detection in cwd
  try {
    if (await fs.pathExists("pnpm-lock.yaml")) return "pnpm";
    if (await fs.pathExists("yarn.lock")) return "yarn";
    if (await fs.pathExists("bun.lock")) return "bun";
    return "npm";
  } catch (_error) {
    return "npm";
  }
}

export async function setupWithNeonDb(projectDir: string): Promise<boolean> {
  try {
    const s = spinner();
    s.start("Creating Neon database using neondb...");

    const cwd = projectDir;
    // Attempt to run the `neondb` binary directly inside the new project.
    // If it's not installed (ENOENT), instruct the user to run it via `npx`.
    try {
      await execa("npx", ["neondb", "--yes"], { cwd });
      s.stop("Neon database created successfully");
      return true;
    } catch (err: any) {
      s.stop("Neon setup failed");
      if (err && err.code === "ENOENT") {
        consola.warn(
          "'neondb' executable not found. Run: `npx neondb --yes` inside the project directory to create the database and update .env"
        );
      } else {
        consola.warn(
          "Neon setup failed. You can run: `npx neondb --yes` inside the project directory to create the database and update .env"
        );
      }
      return false;
    }
  } catch (error) {
    consola.error("Failed to create database with neondb", error);
    return false;
  }
}

export async function main(): Promise<void> {
  // Display a fancy intro
  intro(pastel("Create Express Starter"));

  // Get project name from args or prompt
  let targetDir = process.argv[2];
  if (!targetDir) {
    const response = await text({
      message: "Where would you like to create your project?",
      placeholder: ".",
    });
    if (!response || typeof response === "symbol") process.exit(1);
    targetDir = response;
  }

  // Store original targetDir before resolving to absolute path
  const originalTargetDir = targetDir;

  // Resolve to absolute path
  targetDir = path.resolve(targetDir);

  // Check if directory exists and is not empty
  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      consola.error(
        `Aborting: The target directory '${targetDir}' already exists and is not empty. Please choose a different directory or remove the existing one.`
      );
      process.exit(1);
    }
  }
  // Create directory if it doesn't exist
  await fs.ensureDir(targetDir);

  // Select template type
  const templateType = await select({
    message: "Which Express setup would you like?",
    options: [
      { value: "basic", label: "Basic Express Setup" },
      { value: "advance", label: "Advance Express Setup" },
    ],
  });

  if (typeof templateType === "symbol") process.exit(1);

  TEMPLATE_DIR = path.join(__dirname, "templates", templateType);

  // Database choice (only relevant for advance template)
  let dbChoice: "sqlite" | "neon" = "sqlite";
  if (templateType === "advance") {
    const dbOption = await select({
      message: "Which database would you like to use?",
      options: [
        { value: "sqlite", label: "SQLite (default)" },
        { value: "neon", label: "Neon (Postgres)" },
      ],
    });

    if (typeof dbOption === "symbol") process.exit(1);
    dbChoice = dbOption as "sqlite" | "neon";
  }

  // Git init prompt
  const shouldGitInit = await confirm({
    message: "Would you like to initialize a git repository?",
  });

  // Install dependencies prompt
  const shouldInstall = await confirm({
    message: "Would you like to install dependencies?",
  });

  // Copy template
  const s = spinner();
  s.start("Creating project structure");

  try {
    await fs.copy(TEMPLATE_DIR, targetDir, {
      filter: (src: string) => {
        // Don't copy package-lock.json, pnpm-lock.yaml, yarn.lock, or bun.lock
        const filename = path.basename(src);

        // Don't copy git-ignore.txt directly, we'll handle it separately
        if (filename === "git-ignore.txt") {
          return false;
        }

        return (
          filename !== "node_modules" &&
          filename !== "dist" &&
          !filename.endsWith("lock.json") &&
          !filename.endsWith(".lock") &&
          !filename.endsWith(".yaml")
        );
      },
    });

    // If advance + neon selected, remove sqlite auth schema so we can copy/rename pg one later
    if (templateType === "advance" && dbChoice === "neon") {
      const sqliteAuthPath = path.join(
        targetDir,
        "src",
        "drizzle",
        "auth-schema.sqlite.ts"
      );
      try {
        if (await fs.pathExists(sqliteAuthPath)) {
          await fs.remove(sqliteAuthPath);
        }
      } catch (_e) {
        // ignore
      }

      // Post-process template files to switch to postgres variants
      try {
        // copy auth-schema.pg.ts -> auth-schema.ts
        const pgAuthSrc = path.join(
          TEMPLATE_DIR,
          "src",
          "drizzle",
          "auth-schema.pg.ts"
        );
        const pgAuthDest = path.join(
          targetDir,
          "src",
          "drizzle",
          "auth-schema.ts"
        );
        if (await fs.pathExists(pgAuthSrc)) {
          await fs.copyFile(pgAuthSrc, pgAuthDest);
        }

        // update drizzle.config.ts dialect to postgresql
        const drizzleConfigPath = path.join(targetDir, "drizzle.config.ts");
        if (await fs.pathExists(drizzleConfigPath)) {
          let content = await fs.readFile(drizzleConfigPath, "utf8");
          content = content.replace(
            /dialect:\s*"sqlite"/,
            'dialect: "postgresql"'
          );
          await fs.writeFile(drizzleConfigPath, content, "utf8");
        }

        // update src/drizzle/index.ts to uncomment neon and comment sqlite usage
        const drizzleIndexPath = path.join(
          targetDir,
          "src",
          "drizzle",
          "index.ts"
        );
        if (await fs.pathExists(drizzleIndexPath)) {
          let content = await fs.readFile(drizzleIndexPath, "utf8");
          // simple substitutions: replace better-sqlite3 import with neon/http and set db accordingly
          content = content.replace(
            "drizzle-orm/better-sqlite3",
            "drizzle-orm/neon-http"
          );
          content = content.replace(
            "export const db = drizzle({ connection: { source: env.DATABASE_URL } });",
            "const sql = neon(env.DATABASE_URL!);\nexport const db = drizzle({ client: sql });"
          );
          // add neon import if missing
          if (!content.includes("@neondatabase/serverless")) {
            content = content.replace(
              'import { drizzle } from "drizzle-orm/neon-http";',
              'import { drizzle } from "drizzle-orm/neon-http";\nimport { neon } from "@neondatabase/serverless";'
            );
          }
          await fs.writeFile(drizzleIndexPath, content, "utf8");
        }

        // update src/drizzle/schema.ts export to point to auth-schema.ts
        const schemaPath = path.join(targetDir, "src", "drizzle", "schema.ts");
        if (await fs.pathExists(schemaPath)) {
          let content = await fs.readFile(schemaPath, "utf8");
          content = content.replace("./auth-schema.sqlite", "./auth-schema");
          await fs.writeFile(schemaPath, content, "utf8");
        }

        // update src/utils/auth.ts provider to 'pg'
        const authUtilPath = path.join(targetDir, "src", "utils", "auth.ts");
        if (await fs.pathExists(authUtilPath)) {
          let content = await fs.readFile(authUtilPath, "utf8");
          content = content.replace(
            /provider:\s*"pg"|provider:\s*"sqlite"/,
            'provider: "pg"'
          );
          await fs.writeFile(authUtilPath, content, "utf8");
        }
      } catch (e) {
        consola.error("Failed to post-process template for Neon:", e);
      }
    }

    // Read git-ignore.txt content from template and write to .gitignore in targetDir
    const gitignoreTemplatePath = path.join(TEMPLATE_DIR, "git-ignore.txt");
    const gitignoreContent = await fs.readFile(gitignoreTemplatePath, "utf8");
    await fs.writeFile(path.join(targetDir, ".gitignore"), gitignoreContent);

    // Create .env from env.example.txt (if present). If user selected Neon,
    // remove any DATABASE_URL line so `neondb` can write a fresh value.
    const envExampleCandidates = [
      path.join(TEMPLATE_DIR, "env.example.txt"),
      path.join(TEMPLATE_DIR, "env.example"),
      path.join(targetDir, "env.example.txt"),
      path.join(targetDir, "env.example"),
    ];

    for (const candidate of envExampleCandidates) {
      try {
        if (await fs.pathExists(candidate)) {
          let envContent = await fs.readFile(candidate, "utf8");
          if (templateType === "advance" && dbChoice === "neon") {
            // remove DATABASE_URL lines entirely to avoid neondb failing
            envContent = envContent.replace(/^DATABASE_URL=.*$/gim, "");
          }
          await fs.writeFile(path.join(targetDir, ".env"), envContent, "utf8");
          break;
        }
      } catch (e) {
        // non-fatal; continue to next candidate
      }
    }

    s.stop("Project structure created");
  } catch (error) {
    s.stop("Failed to create project structure");
    consola.error(error);
    process.exit(1);
  }

  // Git init if requested
  if (shouldGitInit) {
    s.start("Initializing git repository");
    try {
      await execa("git", ["init", targetDir]);
      s.stop("Git repository initialized");
    } catch (error) {
      s.stop("Failed to initialize git repository");
      consola.error(error);
    }
  }

  // Install dependencies if requested
  if (shouldInstall) {
    const packageManager = await detectPackageManager();
    consola.info(`Detected package manager: ${packageManager}`);
    s.start(`Installing dependencies with ${packageManager}`);

    try {
      const installCommand = packageManager === "yarn" ? "add" : "install";
      await execa(packageManager, [installCommand], { cwd: targetDir });
      s.stop("Dependencies installed");
    } catch (error) {
      s.stop("Failed to install dependencies");
      consola.error(error);
    }
  }

  // After deps are handled, if user chose Advance + Neon, attempt to run neondb
  if (templateType === "advance" && dbChoice === "neon") {
    try {
      const ok = await setupWithNeonDb(targetDir);
      if (!ok) {
        consola.warn(
          "Could not run neondb automatically. To create a Neon database interactively, run `npx neondb --yes` inside the new project directory. After it finishes, ensure the resulting DATABASE_URL is present in the project's .env."
        );
      }
    } catch (error) {
      // handled by setupWithNeonDb; nothing else to do here
    }
  }

  // Display completion message
  outro(pastel("Project created successfully! 🎉"));

  // Show next steps
  consola.info(`\nNext steps:`);
  if (originalTargetDir !== ".") {
    consola.info(`  cd ${path.relative(process.cwd(), targetDir)}`);
  }
  if (!shouldInstall) {
    consola.info(`  ${await detectPackageManager()} install`);
  }
  consola.info(`  ${await detectPackageManager()} run dev`);
  consola.info(
    `\n  For Drizzle ORM setup, visit: https://orm.drizzle.team/docs/get-started\n`
  );
  const packageManager = await detectPackageManager();
  if (packageManager === "pnpm") {
    consola.info(
      `  For SQLite users, you may need to run: pnpm approve-builds`
    );
  }
}

main().catch(console.error);

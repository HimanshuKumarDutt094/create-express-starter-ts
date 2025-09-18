#!/usr/bin/env node

import { confirm, intro, outro, select, spinner, text } from "@clack/prompts";
import consola from "consola";
import { execa } from "execa";
// ...existing code...
// Remove direct fs import, use fs-utils instead
import fs from "fs-extra";
import { pastel } from "gradient-string";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  copyIfExists,
  exists,
  projPath,
  readIfExists,
  removeIfExists,
  tPath,
  writeFile,
} from "./fs-utils";
import { neonDrizzleIndex, sqliteDrizzleIndex } from "./templates";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let TEMPLATE_DIR: string;

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export async function detectPackageManager(): Promise<PackageManager> {
  // ...existing code...
  const userAgent = process.env.npm_config_user_agent || "";
  if (userAgent.includes("pnpm")) return "pnpm";
  if (userAgent.includes("yarn")) return "yarn";
  if (userAgent.includes("bun")) return "bun";

  // ...existing code...
  try {
    if (await exists("pnpm-lock.yaml")) return "pnpm";
    if (await exists("yarn.lock")) return "yarn";
    if (await exists("bun.lock")) return "bun";
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

  // ...existing code...
  const originalTargetDir = targetDir;

  // ...existing code...
  targetDir = path.resolve(targetDir);

  if (await exists(targetDir)) {
    const files = await fs.promises.readdir(targetDir);
    if (files.length > 0) {
      consola.error(
        `Aborting: The target directory '${targetDir}' already exists and is not empty. Please choose a different directory or remove the existing one.`
      );
      process.exit(1);
    }
  }
  await fs.promises.mkdir(targetDir, { recursive: true });

  // ...existing code...
  const templateType = await select({
    message: "Which Express setup would you like?",
    options: [
      { value: "basic", label: "Basic Express Setup" },
      { value: "advance", label: "Advance Express Setup" },
    ],
  });

  if (typeof templateType === "symbol") process.exit(1);

  TEMPLATE_DIR = path.join(__dirname, "templates", templateType);

  // ...existing code...
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

  // ...existing code...
  const shouldGitInit = await confirm({
    message: "Would you like to initialize a git repository?",
  });

  // ...existing code...
  const shouldInstall = await confirm({
    message: "Would you like to install dependencies?",
  });

  // ...existing code...
  const s = spinner();
  s.start("Creating project structure");

  try {
    await fs.copy(TEMPLATE_DIR, targetDir, {
      filter: (src: string) => {
        const filename = path.basename(src);
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

    // Post-process template files to copy selected auth schema to `auth-schema.ts`
    if (templateType === "advance") {
      try {
        // Determine source schema in the template
        const selectedSrcName =
          dbChoice === "neon" ? "auth-schema.pg.ts" : "auth-schema.sqlite.ts";
        const selectedSrc = tPath(
          TEMPLATE_DIR,
          "src",
          "drizzle",
          selectedSrcName
        );
        const destAuth = projPath(
          targetDir,
          "src",
          "drizzle",
          "auth-schema.ts"
        );
        // Copy selected variant into auth-schema.ts
        await copyIfExists(selectedSrc, destAuth);

        // Update drizzle.config.ts dialect for neon
        if (dbChoice === "neon") {
          const drizzleConfigPath = projPath(targetDir, "drizzle.config.ts");
          if (await exists(drizzleConfigPath)) {
            let content = await readIfExists(drizzleConfigPath);
            if (content !== null) {
              content = content.replace(
                /dialect:\s*"sqlite"/,
                'dialect: "postgresql"'
              );
              await writeFile(drizzleConfigPath, content);
            }
          }
        }

        // Write deterministic `src/drizzle/index.ts` based on selected DB
        const drizzleIndexPath = projPath(
          targetDir,
          "src",
          "drizzle",
          "index.ts"
        );
        if (dbChoice === "neon") {
          await writeFile(drizzleIndexPath, neonDrizzleIndex);
        } else {
          await writeFile(drizzleIndexPath, sqliteDrizzleIndex);
        }

        // Update `schema.ts` to import from `./auth-schema`
        const schemaPath = projPath(targetDir, "src", "drizzle", "schema.ts");
        if (await exists(schemaPath)) {
          let content = await readIfExists(schemaPath);
          if (content !== null) {
            content = content.replace(
              /\.\/auth-schema\.(sqlite|pg)/,
              "./auth-schema"
            );
            await writeFile(schemaPath, content);
          }
        }

        // Update auth util provider selection for neon
        const authUtilPath = projPath(targetDir, "src", "utils", "auth.ts");
        if (await exists(authUtilPath)) {
          let content = await readIfExists(authUtilPath);
          if (content !== null) {
            if (dbChoice === "neon") {
              content = content.replace(
                /provider:\s*"pg"|provider:\s*"sqlite"/,
                'provider: "pg"'
              );
            } else {
              content = content.replace(
                /provider:\s*"pg"|provider:\s*"sqlite"/,
                'provider: "sqlite"'
              );
            }
            await writeFile(authUtilPath, content);
          }
        }

        // Finally remove both variant files from the generated project so only `auth-schema.ts` remains
        const pgAuthPath = projPath(
          targetDir,
          "src",
          "drizzle",
          "auth-schema.pg.ts"
        );
        const sqliteAuthPath = projPath(
          targetDir,
          "src",
          "drizzle",
          "auth-schema.sqlite.ts"
        );
        try {
          await removeIfExists(pgAuthPath);
        } catch (_e) {
          // ignore
        }
        try {
          await removeIfExists(sqliteAuthPath);
        } catch (_e) {
          // ignore
        }
      } catch (e) {
        consola.error("Failed to post-process template for DB selection:", e);
      }
    }

    // Read git-ignore.txt content from template and write to .gitignore in targetDir
    const gitignoreTemplatePath = path.join(TEMPLATE_DIR, "git-ignore.txt");
    const gitignoreContent = await readIfExists(gitignoreTemplatePath);
    if (gitignoreContent !== null) {
      await writeFile(path.join(targetDir, ".gitignore"), gitignoreContent);
    }

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
        if (await exists(candidate)) {
          let envContent = await readIfExists(candidate);
          if (envContent !== null) {
            if (templateType === "advance" && dbChoice === "neon") {
              envContent = envContent.replace(/^DATABASE_URL=.*$/gim, "");
            }
            await writeFile(path.join(targetDir, ".env"), envContent);
            break;
          }
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

  // ...existing code...
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

  // ...existing code...
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

  // ...existing code...
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

  // ...existing code...
  outro(pastel("Project created successfully! 🎉"));

  // ...existing code...
  const packageManager = await detectPackageManager();
  consola.info(`\nNext steps:`);
  if (originalTargetDir !== ".") {
    consola.info(`  cd ${path.relative(process.cwd(), targetDir)}`);
  }
  if (!shouldInstall) {
    consola.info(`  ${packageManager} install`);
  }
  // If advance template (uses Drizzle), suggest running db push before starting dev
  if (templateType === "advance") {
    if (packageManager === "yarn") {
      consola.info(`  yarn db:push`);
    } else {
      consola.info(`  ${packageManager} run db:push`);
    }
  }
  if (packageManager === "yarn") {
    consola.info(`  yarn dev`);
  } else {
    consola.info(`  ${packageManager} run dev`);
  }
  if (packageManager === "pnpm") {
    consola.info(
      `  For SQLite users, you may need to run: pnpm approve-builds`
    );
  }
}

main().catch(console.error);

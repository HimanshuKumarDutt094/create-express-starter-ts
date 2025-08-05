import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, "src", "templates");
const destDir = path.join(__dirname, "dist", "templates");

async function copyTemplates() {
  try {
    await fs.copy(sourceDir, destDir, {
      filter: (src, dest) => {
        // This filter ensures dotfiles are copied.
        // fs-extra's copy by default includes dotfiles, but this is for explicit clarity.
        return true;
      },
    });
    console.log("Templates copied successfully!");
  } catch (err) {
    console.error("Error copying templates:", err);
    process.exit(1);
  }
}

copyTemplates();

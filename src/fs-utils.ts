import fs from "fs-extra";
import path from "node:path";

// tPath: template path under src/templates/<template>
export function tPath(templateDir: string, ...parts: string[]) {
  return path.join(templateDir, ...parts);
}

// projPath: target project path under the created project
export function projPath(projectDir: string, ...parts: string[]) {
  return path.join(projectDir, ...parts);
}

export async function exists(p: string) {
  return fs.pathExists(p);
}

export async function copyIfExists(src: string, dest: string) {
  if (await fs.pathExists(src)) {
    await fs.copy(src, dest);
    return true;
  }
  return false;
}

export async function removeIfExists(p: string) {
  if (await fs.pathExists(p)) {
    await fs.remove(p);
    return true;
  }
  return false;
}

export async function readIfExists(p: string) {
  if (await fs.pathExists(p)) return fs.readFile(p, "utf8");
  return null;
}

export async function writeFile(p: string, content: string) {
  await fs.mkdirp(path.dirname(p));
  return fs.writeFile(p, content, "utf8");
}

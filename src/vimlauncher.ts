import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, sep } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export interface VimOptions {
  initialContent?: string;
  fileName?: string;
  encoding?: BufferEncoding;
  input?: string;
}

async function withTempFile(encoding: BufferEncoding, callback: (fileName: string) => Promise<void>): Promise<void> {
  let fileName: string | undefined;
  let tempDir: string | undefined;
  try {
    const tmpPrefix = join(tmpdir(), 'vim-');
    tempDir = await fs.mkdir(`${tmpPrefix}${sep}`, { recursive: true }).then(() =>
      fs.mkdtemp(`${tmpPrefix}${sep}`, { encoding })
    );
    fileName = join(tempDir!, `${randomUUID()}.txt`);
    await callback(fileName);
  }
  finally {
    if (tempDir) cleanup(tempDir);
  }
}

async function openVimWithFile(options: VimOptions): Promise<string> {
  let result: string | undefined;
  await withTempFile(options.encoding || 'utf8', async (fileName: string): Promise<void> => {
    if (options.initialContent) {
      await fs.writeFile(fileName, options.initialContent, options.encoding || 'utf8');
    }
    await openVim([fileName]);
    result = await fs.readFile(fileName, options.encoding || 'utf8');
  });
  if (result !== '' && result) return result;
  throw Error('No result returned');
}

/**
 * Opens Vim in the current terminal and returns a promise that resolves
 * with the content of the buffer when Vim is closed
 */
async function openVim(input: string[]): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    const vimProcess = spawn('nvim.exe', input, {
        stdio: ['inherit', 'inherit', 'inherit'],
        windowsHide: false,
        shell: true 
    });

    vimProcess.on('error', (err) => reject(err));

    vimProcess.on('exit', async (code) => {
      try {
        if (code !== 0) {
          throw new Error(`Vim process exited with code ${code}`);
        }

        resolve();
      } catch (err) {
        reject();
      }
    });
  });
}

async function cleanup(tempDir: string): Promise<void> {
  try {
    const files = await fs.readdir(tempDir);
    await Promise.all(
      files.map(file => fs.unlink(join(tempDir, file)))
    );
    await fs.rmdir(tempDir);
  } catch (err) {
    console.error('Error during cleanup:', err);
    throw err;
  }
}

export default {
  openVim,
  openVimWithFile
}

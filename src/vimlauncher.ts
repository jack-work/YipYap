import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, sep } from 'path';
import { tmpdir } from 'os';

export interface VimOptions {
  initialContent?: string;
  fileName?: string;
  encoding?: BufferEncoding;
}

/**
 * Opens Vim in the current terminal and returns a promise that resolves
 * with the content of the buffer when Vim is closed
 */
async function openVim(options: VimOptions = {}): Promise<string> {
  const encoding = options.encoding || 'utf8';
  const tmpPrefix = join(tmpdir(), 'vim-');

  const tempDir = await fs.mkdir(`${tmpPrefix}${sep}`, { recursive: true }).then(() =>
    fs.mkdtemp(`${tmpPrefix}${sep}`, { encoding })
  );
  const filePath = join(tempDir, options.fileName || 'temp.txt');

  if (options.initialContent) {
    await fs.writeFile(filePath, options.initialContent, encoding);
  }

  return new Promise<string>((resolve, reject) => {
    const vimProcess = spawn('nvim.exe', [filePath], {
      stdio: ['inherit', 'inherit', 'inherit'],
      windowsHide: false,
      shell: false // Don't run in shell, run directly
    });

    vimProcess.on('error', (err) => {
      cleanup(tempDir)
        .catch(cleanupError => console.error('Cleanup failed:', cleanupError))
        .finally(() => reject(err));
    });

    vimProcess.on('exit', async (code) => {
      try {
        if (code !== 0) {
          throw new Error(`Vim process exited with code ${code}`);
        }

        const content = await fs.readFile(filePath, encoding);
        await cleanup(tempDir);
        resolve(content);
      } catch (err) {
        await cleanup(tempDir)
          .finally(() => reject(err));
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

export default openVim;

import { DiagLogger } from '@opentelemetry/api';
import { promises as fs } from 'fs';
import { join, sep } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createTerminal } from './terminalApplication.js';

export interface VimOptions {
  initialContent?: string;
  fileName?: string;
  encoding?: BufferEncoding;
  input?: string;
}

export type Vim = {
  runWithFile(options: VimOptions): PromiseLike<string>;
  run(input: string[]): PromiseLike<void>;
}

async function withTempFile(encoding: BufferEncoding, callback: (fileName: string) => Promise<void>, logger: DiagLogger): Promise<void> {
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
    if (tempDir) cleanup(tempDir, logger);
  }
}

/**
 * Opens Vim in the current terminal and returns a promise that resolves
 * with the content of the buffer when Vim is closed
 */
async function openVim(input: string[], logger: DiagLogger): Promise<void> {
  return createTerminal('nvim', logger).run(input);
}

async function cleanup(tempDir: string, logger: DiagLogger): Promise<void> {
  try {
    const files = await fs.readdir(tempDir);
    await Promise.all(
      files.map(file => fs.unlink(join(tempDir, file)))
    );
    await fs.rmdir(tempDir);
  } catch (err) {
    logger.error('Error during cleanup:', err);
    throw err;
  }
}

export function createVim(logger: DiagLogger): Vim {
  return {
    run: (input) => { return createTerminal('nvim', logger).run(input); },
    runWithFile: async (options: VimOptions) => {
      let result: string | undefined;
      await withTempFile(options.encoding || 'utf8', async (fileName: string): Promise<void> => {
        if (options.initialContent) {
          await fs.writeFile(fileName, options.initialContent, options.encoding || 'utf8');
        }
        await openVim([fileName], logger);
        result = await fs.readFile(fileName, options.encoding || 'utf8');
      }, logger);
      if (result !== '' && result) return result;
      throw Error('No result returned');
    }
  };
}

export default {
  createVim
}

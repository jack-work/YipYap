#!/usr/bin/env node
import { DiagLogger } from '@opentelemetry/api';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import clipboardy from 'clipboardy';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import record from 'node-record-lpcm16';
import vim from './vimlauncher.js';
import { openAiScribe } from './openAiScribe.js';
import { exit } from 'process';
import { Scribe } from './Scribe.js';
import { Action, Menu, Order } from 'Menu';
import { createTerminal } from './terminalApplication.js';
import { createConsoleLogger } from './consoleLogger.js';
import { readFile } from 'node:fs/promises';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

export type YipYapOptions = {
  transcribe: Scribe;
  menu: Menu;
}

export type YipYap = {
  run(): Promise<void>;
}


async function readTextFile(path: string, logger: DiagLogger) {
  try {
    const content = await readFile(path, 'utf-8');
    return content;
  } catch (err) {
    logger.error('Failed to read file:', err);
    logger.error('Working directory:', process.cwd());
    throw err;
  }
}

export function create(options: YipYapOptions, logger: DiagLogger): YipYap {
  return {
    run: async () => {
      let stop: boolean;
      do {
        stop = true;
        try {
          logger.info('Starting recording...');
          const fileName = `recording-${Date.now()}.wav`;
          const actions = await recordAudio(fileName, options.menu, logger);
          logger.info('Recording stopped. Starting transcription...');
          let transcription = await options.transcribe(fileName);
          for (const action of actions.steps) {
            if (await action.keep()) {
              transcription = await action.run(transcription);
            }
            if (await action.shouldrerun(transcription)) {
              stop = false;
            }
          }
          return;
        } catch (error) {
          logger.error('Failed to process audio:', error);
        }
      } while (!stop)
    }
  }
}

async function recordAudio(fileName: string, orders: Menu, logger: DiagLogger): Promise<Order> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(fileName);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    let recording: record.Recording | undefined;

    const cleanup = (result: Order | undefined = undefined) => {
      try {
        if (recording) {
          //recording.stop();
        }
      } catch (err) {
        logger.error('Error stopping recording:', err);
      }

      // Close readline interface
      rl.close();

      // Reset stdin
      process.stdin.setRawMode(false);
      process.stdin.removeAllListeners('keypress');

      // Ensure file stream is closed
      fileStream.end();

      // Reset terminal
      process.stdout.write('\n');

      if (result) resolve(result);
    };

    try {
      recording = record.record();
    } catch (error: any) {
      logger.info(error);
      cleanup();
      reject(error);
      return;
    }

    recording.stream()
      .pipe(fileStream)
      .on('error', (error: any) => {
        logger.info(`An error has occurred while recording audio: ${error}`);
        cleanup();
        reject(error);
      });

    logger.info('Recording...');

    const keybindingMap = new Map<string, Order>();
    for (const key in orders) {
      const order = orders[key];
      logger.info(`Press '${order.keybinding}' to ${order.description}`);
      keybindingMap.set(order.keybinding, order);
    }

    logger.info('...')

    process.stdin.on('keypress', (_str, key) => {
      const order = keybindingMap.get(key.name);
      if (order) {
        logger.info('got order');
        cleanup(order);
      }
    });
  });
}

function createActions(logger: DiagLogger): { [key: string]: Action } {
  return {
    aichat: {
      shouldrerun: (): Promise<boolean> => { return Promise.resolve(false); },
      run: async (content: string): Promise<string> => {
        if (content) {
          await createTerminal('aichat', logger).run([
            '--prompt', `"${await usePrompt(content, logger)}"`
          ]);
          return content;
        } else {
          throw new Error('No transcription returned');
        }
      },
      keep: () => { return Promise.resolve(true); }
    },
    edit: {
      shouldrerun: (): Promise<boolean> => { return Promise.resolve(false); },
      run: async (content: string): Promise<string> => {
        if (content) {
          return await vim.createVim(logger).runWithFile({
            initialContent: content,
            fileName: `recording-${Date.now()}.md`,
            encoding: 'utf8',
          });
        } else {
          throw new Error('No transcription returned');
        }
      },
      keep: () => { return Promise.resolve(true); }
    },
    copy: {
      shouldrerun: (): Promise<boolean> => { return Promise.resolve(false); },
      run: async (content: string): Promise<string> => {
        if (content) {
          await clipboardy.write(content);
          return content;
        } else {
          throw new Error('No transcription returned');
        }
      },
      keep: (): Promise<boolean> => { return Promise.resolve(true); },
    },
    retry: {
      keep: (): Promise<boolean> => { return Promise.resolve(false); },
      run: async (_content: string): Promise<string> => {
        return Promise.resolve('');
      },
      shouldrerun: (): Promise<boolean> => { return Promise.resolve(true); },
    },
    quit: {
      keep: () => { return Promise.resolve(false); },
      run: (_content: string) => { return Promise.resolve(''); },
      shouldrerun: () => { return Promise.resolve(false); },
    }
  }
}

async function usePrompt(content: string, logger: DiagLogger): Promise<string> {
  const prompt = await readTextFile('data/prompt.md', logger);
  // Probably not as efficient as it could be but it doesn't matter.
  return `${prompt}  ${content}`.replace(/```/g, '\\`\\`\\`');
}


function createDefaultMenu(logger: DiagLogger): Menu {
  const actions = createActions(logger);
  return {
    aichat: {
      keybinding: 'a',
      description: 'open aichat with input',
      steps: [actions.aichat]
    },
    editAndCopy: {
      keybinding: 'e',
      description: 'edit, then copy',
      steps: [actions.edit, actions.copy]
    },
    copy: {
      keybinding: 'space',
      description: 'copy to clipboard',
      steps: [actions.copy]
    },
    quit: {
      keybinding: 'q',
      description: 'quit',
      steps: [actions.quit]
    }
  };
}

async function main() {
  const logger = createConsoleLogger();
  await create({
    transcribe: openAiScribe,
    menu: createDefaultMenu(logger),
  }, logger).run();
  exit();
}

main();

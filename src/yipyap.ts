#!/usr/bin/env node
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

export function create(options: YipYapOptions): YipYap {
  return {
    run: async () => {
      let stop: boolean;
      do {
        stop = true;
        try {
          console.log('Starting recording...');
          const fileName = `recording-${Date.now()}.wav`;
          const actions = await recordAudio(fileName, options.menu);
          console.log('Recording stopped. Starting transcription...');
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
          console.error('Failed to process audio:', error);
        }
      } while (!stop)
    }
  }
}

async function recordAudio(fileName: string, orders: Menu): Promise<Order> {
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
        console.error('Error stopping recording:', err);
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
      console.log(error);
      cleanup();
      reject(error);
      return;
    }

    recording.stream()
      .pipe(fileStream)
      .on('error', (error: any) => {
        console.log(`An error has occurred while recording audio: ${error}`);
        cleanup();
        reject(error);
      });

    console.log('Recording...');

    const keybindingMap = new Map<string, Order>();
    for (const key in orders) {
      const order = orders[key];
      console.log(`Press '${order.keybinding}' to ${key}`);
      keybindingMap.set(order.keybinding, order);
    }

    console.log('...')

    process.stdin.on('keypress', (_str, key) => {
      const order = keybindingMap.get(key.name);
      if (order) {
        console.log('got order');
        cleanup(order);
      }
    });
  });
}

const actions: { [key: string]: Action } = {
  aichat: {
    shouldrerun: (): Promise<boolean> => { return Promise.resolve(false); },
    run: async (content: string): Promise<string> => {
      if (content) {
        //await vim.openVim(`-c 'terminal' -c 'startinsert | call feedkeys("aichat --session \'test\' --prompt \'${content.replace(/"/g, "\\'")}\'")`);
        //await vim.openVim(`-c "terminal" -c "startinsert | call feedkeys('aichat')"`);
        //await vim.openVim(["-c", '\"terminal\"', "-c", '\"startinsert | call feedkeys(\'aichat --prompt \\\"${content}\\\")\"']);
        await vim.openVim([
            "-c", '\"terminal\"',
            // This probably only works with powershell due to the double quotes sadly.  Need a better terminal abstraction to make it more versitile.
            "-c", `"startinsert | call feedkeys('aichat --session ""test"" --prompt ""${content}""' . nr2char(13))"`
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
        return await vim.openVimWithFile({
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
}

const defaultMenu: Menu = {
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
  }
};

async function main() {
  await create({
    transcribe: openAiScribe,
    menu: defaultMenu,
  }).run();
  exit();
}

main();


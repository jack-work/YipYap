#!/usr/bin/env node
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import clipboardy from 'clipboardy';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import record from 'node-record-lpcm16';
import openVim from './vimlauncher.js';
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
      try {
        console.log('Starting recording...');
        const fileName = `recording-${Date.now()}.wav`;
        const actions = await recordAudio(fileName, options.menu);
        console.log('Recording stopped. Starting transcription...');
        let transcription = await options.transcribe(fileName);
        for (const action of actions.steps) {
          transcription = await action(transcription);
        }
        return;
      } catch (error) {
        console.error('Failed to process audio:', error);
      }
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

const actions: { edit: Action, copy: Action } = {
  edit: async (content: string): Promise<string> => {
    if (content) {
      return await openVim({
        initialContent: content,
        fileName: `recording-${Date.now()}.md`,
        encoding: 'utf8',
      });
    } else {
      throw new Error('No transcription returned');
    }
  },
  copy: async (content: string): Promise<string> => {
    if (content) {
      await clipboardy.write(content);
      return content;
    } else {
      throw new Error('No transcription returned');
    }
  }
}

const defaultMenu: Menu = {
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


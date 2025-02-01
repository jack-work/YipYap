import * as fs from 'fs';
import { ReadStream } from 'fs';
import { OpenAI } from 'openai';
import { Scribe } from './Scribe';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openAiScribe: Scribe = async (audioFilePath: string): Promise<string> => {
  let audioFile: ReadStream | undefined;
  try {
    audioFile = fs.createReadStream(audioFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    return transcription.text;
  } catch (error) {
    console.error('Error during transcription:', error);
    throw error;
  }
  finally {
    audioFile?.close();
    fs.rmSync(audioFilePath);
  }
}

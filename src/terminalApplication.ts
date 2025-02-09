import { DiagLogger } from '@opentelemetry/api';
import { spawn } from 'child_process';

export type TerminalApplication = {
  run(input: string[]): PromiseLike<void>;
}
export function createTerminal(programName: string, logger: DiagLogger): TerminalApplication {
  return {
    run: input => {
      return new Promise<void>(async (resolve, reject) => {
        logger.info('Application is starting');
        logger.info(`Spawning process with command: ${programName} ${input.join(' ')}`);
        const process = spawn(programName, input, {
          stdio: ['inherit', 'inherit', 'inherit'],
          windowsHide: false,
          shell: true
        });
        logger.info('Process was spawned');
        process.on('error', (err) => {
          logger.error(`An error has occurred while running ${programName}: ${err}`)
          reject(err)
        });
        process.on('exit', async (code) => {
          try {
            logger.info(`${programName} exited with status code ${code}`)
            if (code !== 0) {
              throw new Error(`Application exited process exited with code ${code}`);
            }

            resolve();
          } catch (err) {
            reject();
          }
        });
      });
    }
  };
}


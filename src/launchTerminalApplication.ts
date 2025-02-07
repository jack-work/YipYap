import { spawn } from 'child_process';

export function launchTerminalApplication(programName: string, input: string[]): void | PromiseLike<void> {
    return new Promise<void>(async (resolve, reject) => {
        const vimProcess = spawn(programName, input, {
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


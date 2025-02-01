# YipYap

YipYap is a simple command-line tool that provides voice-to-text transcription.

It uses OpenAI whisper API for transcription, but I'd like to support other forms of transcription in the future.

## Prerequisites

Before installing YipYap, ensure you have the following dependencies installed:

1. **SOX (Sound eXchange) version 14.1.1**
   - Windows users: Install [SOX 14.1.1](https://sourceforge.net/projects/sox/files/sox/14.1.1/)
    - SOX 14.1.2 does not work properly with the node library that calls it
   - Make sure to install the Windows Audio Manager component during SOX installation

2. **NeoVim**
   - Required for the edit functionality
   - Install from [NeoVim's official website](https://neovim.io/)

3. **Node.js**
   - Required to run YipYap

## Installation

1. Clone this repository:
```bash
git clone [repository-url]
cd yipyap
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. **OpenAI API Key**
   - Create an account at [OpenAI](https://openai.com)
   - Get your API key from the OpenAI dashboard
   - Set your API key as an environment variable:
     ```bash
     export OPENAI_API_KEY=your_api_key_here
     ```
   - Or create a `.env` file in the project root:
     ```
     OPENAI_API_KEY=your_api_key_here
     ```

## Usage

Run YipYap from the command line:
```bash
npm start
```

### Controls
- Press `e` to transcribe, edit in NeoVim, and copy to clipboard
- Press `space` to transcribe and copy directly to clipboard

## Optional: AutoHotkey Integration

To set up a global hotkey for YipYap:

1. Install [AutoHotkey](https://www.autohotkey.com/) v14.1.1
2. Create an AutoHotkey script (`.ahk` file) with your preferred hotkey:
```autohotkey
; Example: Ctrl+Alt+Y to launch YipYap
^!y::
Run, path\to\yipyap\start-script
return
```

## Troubleshooting

If you encounter audio recording issues:
- Verify SOX 14.1.1 is properly installed
- Check if Windows Audio Manager was included in SOX installation
- Ensure your microphone is set as the default recording device

For transcription issues:
- Verify your OpenAI API key is correctly set
- Check your internet connection

For editing issues:
- Verify NeoVim is installed and accessible from the command line


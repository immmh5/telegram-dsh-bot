# Telegram Bot for DeepSeek Harness 🤖

A Telegram bot that allows you to interact with DeepSeek Harness directly from Telegram messenger.

## Features

- 💬 Chat with DeepSeek AI through Telegram
- 🔄 Maintain conversation history per user
- 🤖 Switch between different AI models
- 🆕 Start new conversations anytime
- ⚡ Fast response times

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and reset session |
| `/help` | Show help information |
| `/newchat` | Clear conversation and start fresh |
| `/model` | Show current AI model |
| `/models` | List available models |
| `/setmodel <model_id>` | Change AI model |
| `<any text>` | Chat with AI |

## Available Models

- `deepseek-chat` - DeepSeek V3 (Default)
- `deepseek-reasoner` - DeepSeek R1 (Reasoning)
- `gpt-4o` - OpenAI GPT-4
- `claude-3-5-sonnet` - Anthropic Claude 3.5

## Prerequisites

- Node.js 20 or higher
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- DeepSeek API Key (optional, for fallback)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd telegram-dsh-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DEEP_SEEK_API_KEY=your_deepseek_api_key
DSH_MODEL=deepseek-chat
```

### 3. Run

```bash
npm start
```

## Deploy to Render.com 🚀

### One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Manual Deploy

1. Push this project to GitHub
2. Go to [render.com](https://render.com)
3. Create a new Web Service
4. Connect your GitHub repo
5. Add environment variables:
   - `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
   - `DEEP_SEEK_API_KEY` - Your DeepSeek API key
   - `DSH_MODEL` - Model to use (default: deepseek-chat)
6. Deploy!

### Environment Variables on Render

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram bot token from @BotFather |
| `DEEP_SEEK_API_KEY` | ✅ | DeepSeek API key |
| `DSH_MODEL` | ❌ | Model name (default: deepseek-chat) |
| `SESSIONS_DIR` | ❌ | Session storage path |
| `NODE_ENV` | ❌ | Set to `production` |

## Project Structure

```
telegram-dsh-bot/
├── src/
│   └── index.js          # Main bot code
├── sessions/             # Conversation history (auto-created)
├── Dockerfile            # Docker configuration
├── render.yaml           # Render.com blueprint
├── .env.example          # Environment template
└── package.json          # Dependencies
```

## How It Works

1. Messages from Telegram are received by the bot
2. The bot maintains conversation history per user in JSON files
3. For each message, the bot:
   - Loads the user's conversation history
   - Sends the full conversation to DSH (or DeepSeek API as fallback)
   - Returns the AI response to the user
4. Conversation history is saved for context in future messages

## Notes

- The bot uses the DeepSeek API as a fallback when DSH is not available
- For best results, install DSH globally (`npm install -g @deepseek-ai/dsh`)
- Sessions are stored locally in JSON files
- Each user has their own independent conversation

## License

MIT
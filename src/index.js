/**
 * Telegram Bot Bridge for DeepSeek Harness
 * 
 * This bot allows you to interact with DeepSeek Harness from Telegram.
 * Commands:
 *   /start - Start a new conversation
 *   /newchat - Clear conversation history and start fresh
 *   /model - Show/change current model
 *   /models - List available models
 *   /help - Show available commands
 */

import { Telegraf, Markup } from 'telegraf';
import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create HTTP server for health checks
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Telegram DSH Bot is running!');
  }
});

const HTTP_PORT = process.env.PORT || 3000;
httpServer.listen(HTTP_PORT, () => {
  console.log(`🌐 Health check server running on port ${HTTP_PORT}`);
});

// Load environment variables
dotenv.config();

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DSH_MODEL = process.env.DSH_MODEL || 'deepseek-chat';
const DSH_BASE_URL = process.env.DSH_BASE_URL || 'http://localhost:3080';
const SESSIONS_DIR = process.env.SESSIONS_DIR || join(__dirname, 'sessions');

// Ensure sessions directory exists
if (!existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Validate bot token
if (!TELEGRAM_BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable is required');
  console.error('Get your bot token from @BotFather on Telegram');
  process.exit(1);
}

// Available models
const AVAILABLE_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek V3', description: 'Default chat model' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', description: 'Reasoning model' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI GPT-4' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Anthropic Claude' }
];

// Session management
class SessionManager {
  constructor(sessionsDir) {
    this.sessionsDir = sessionsDir;
  }

  getSessionFile(userId) {
    return join(this.sessionsDir, `session_${userId}.json`);
  }

  loadSession(userId) {
    const file = this.getSessionFile(userId);
    if (existsSync(file)) {
      try {
        return JSON.parse(readFileSync(file, 'utf8'));
      } catch (e) {
        console.error('Error loading session:', e);
      }
    }
    return { 
      messages: [], 
      model: DSH_MODEL,
      createdAt: Date.now()
    };
  }

  saveSession(userId, session) {
    const file = this.getSessionFile(userId);
    try {
      writeFileSync(file, JSON.stringify(session, null, 2));
    } catch (e) {
      console.error('Error saving session:', e);
    }
  }

  clearSession(userId) {
    const file = this.getSessionFile(userId);
    if (existsSync(file)) {
      try {
        writeFileSync(file, JSON.stringify({ 
          messages: [], 
          model: DSH_MODEL,
          createdAt: Date.now()
        }, null, 2));
      } catch (e) {
        console.error('Error clearing session:', e);
      }
    }
  }
}

// DSH Bridge - communicates with DeepSeek Harness
class DSHBridge {
  constructor() {
    this.processing = new Set();
  }

  async sendMessage(userId, message, sessionManager) {
    const session = sessionManager.loadSession(userId);
    
    // Add user message to history
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Build full prompt with conversation history
    const fullPrompt = this.buildPrompt(session.messages);
    
    // Mark as processing
    if (this.processing.has(userId)) {
      throw new Error('Already processing a request. Please wait.');
    }
    this.processing.add(userId);

    try {
      // Try using DSH headless mode
      const response = await this.runDSHHeadless(fullPrompt, session.model);
      
      // Add assistant response to history
      session.messages.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      // Save session
      sessionManager.saveSession(userId, session);

      return response;
    } finally {
      this.processing.delete(userId);
    }
  }

  buildPrompt(messages) {
    // Build a conversation string from message history
    let prompt = '';
    
    for (const msg of messages) {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n\n`;
      }
    }
    
    prompt += 'Assistant: ';
    
    return prompt;
  }

  async runDSHHeadless(prompt, model) {
    return new Promise((resolve, reject) => {
      // Try to run DSH headless
      // Note: DSH must be installed and in PATH
      const dsh = spawn('dsh', [
        '--profile', 'headless',
        '--from-default-profile', 'sdk-minimal',
        prompt
      ], {
        env: {
          ...process.env,
          DSH_MODEL: model
        },
        timeout: 120000
      });

      let stdout = '';
      let stderr = '';

      dsh.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      dsh.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      dsh.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          // If DSH fails, try direct API call as fallback
          this.callDirectAPI(prompt, model)
            .then(resolve)
            .catch(reject);
        }
      });

      dsh.on('error', () => {
        // DSH not available, use direct API
        this.callDirectAPI(prompt, model)
          .then(resolve)
          .catch(reject);
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        dsh.kill();
        reject(new Error('DSH processing timed out'));
      }, 120000);
    });
  }

  async callDirectAPI(prompt, model) {
    // Fallback: Direct API call to DeepSeek
    const apiKey = process.env.DEEP_SEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DEEP_SEEK_API_KEY not configured and DSH not available');
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  setModel(userId, model, sessionManager) {
    const session = sessionManager.loadSession(userId);
    session.model = model;
    sessionManager.saveSession(userId, session);
    return `Model changed to ${model}`;
  }
}

// Initialize
const sessionManager = new SessionManager(SESSIONS_DIR);
const dshBridge = new DSHBridge();
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Helper function to escape Markdown
function escapeMarkdown(text) {
  return text
    .replace(/\_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

// Middleware to track user
bot.use((ctx, next) => {
  ctx.userId = ctx.from?.id?.toString() || 'unknown';
  return next();
});

// Start command
bot.command('start', async (ctx) => {
  const userId = ctx.userId;
  sessionManager.clearSession(userId);
  
  const welcomeMessage = `
🤖 *Welcome to DeepSeek Harness Bot!*

I allow you to interact with DeepSeek Harness directly from Telegram.

*Available Commands:*

• \`/newchat\` - Start a new conversation
• \`/model\` - Show current model
• \`/models\` - List available models
• \`/setmodel <model_id>\` - Change model
• \`/help\` - Show this help

Just send me a message and I'll respond using DeepSeek AI!
`;
  
  await ctx.replyWithMarkdown(welcomeMessage);
});

// Help command
bot.command('help', async (ctx) => {
  const helpMessage = `
📚 *Help - DeepSeek Harness Bot*

*Commands:*

• \`/start\` - Start/restart the bot
• \`/newchat\` - Clear conversation and start fresh
• \`/model\` - Show current model
• \`/models\` - List all available models
• \`/setmodel <model_id>\` - Change to a specific model
• \`/help\` - Show this help

*Examples:*
• \`/setmodel deepseek-chat\` - Switch to DeepSeek V3
• \`/setmodel deepseek-reasoner\` - Switch to DeepSeek R1

Just type your message to chat with AI!
`;
  
  await ctx.replyWithMarkdown(helpMessage);
});

// New chat command
bot.command('newchat', async (ctx) => {
  const userId = ctx.userId;
  sessionManager.clearSession(userId);
  await ctx.reply('✅ New conversation started! Previous messages cleared.');
});

// Show current model
bot.command('model', async (ctx) => {
  const userId = ctx.userId;
  const session = sessionManager.loadSession(userId);
  const modelInfo = AVAILABLE_MODELS.find(m => m.id === session.model) || { name: session.model, description: 'Unknown' };
  
  await ctx.reply(`Current model: *${modelInfo.name}*\nID: \`${session.model}\``, {
    parse_mode: 'Markdown'
  });
});

// List available models
bot.command('models', async (ctx) => {
  let message = '🧠 *Available Models:*\n\n';
  
  for (const model of AVAILABLE_MODELS) {
    const isSelected = sessionManager.loadSession(ctx.userId).model === model.id;
    const marker = isSelected ? '✅' : '  ';
    message += `${marker} *${model.name}*\n   \`${model.id}\` - ${model.description}\n\n`;
  }
  
  message += '\nUse `/setmodel <model_id>` to change models.';
  
  await ctx.replyWithMarkdown(message);
});

// Set model command
bot.command('setmodel', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length === 0) {
    await ctx.reply('Usage: /setmodel <model_id>\n\nUse /models to see available models.');
    return;
  }
  
  const modelId = args[0];
  const modelInfo = AVAILABLE_MODELS.find(m => m.id === modelId);
  
  if (!modelInfo) {
    await ctx.reply(`Unknown model: ${modelId}\n\nUse /models to see available models.`);
    return;
  }
  
  const userId = ctx.userId;
  dshBridge.setModel(userId, modelId, sessionManager);
  
  await ctx.reply(`✅ Model changed to *${modelInfo.name}*`, { parse_mode: 'Markdown' });
});

// Handle all other messages
bot.on('message', async (ctx) => {
  // Ignore non-text messages
  if (ctx.message && !('text' in ctx.message)) {
    await ctx.reply('Sorry, I can only process text messages.');
    return;
  }

  const userId = ctx.userId;
  const userMessage = ctx.message.text;

  // Skip commands (they start with /)
  if (userMessage.startsWith('/')) {
    return;
  }

  // Show typing indicator
  await ctx.reply('🤔 Thinking...');

  try {
    const response = await dshBridge.sendMessage(userId, userMessage, sessionManager);
    
    // Send response (handle long messages)
    if (response.length > 4000) {
      // Split into chunks
      const chunks = response.match(/[\s\S]{1,4000}/g) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'Markdown' });
      }
    } else {
      await ctx.reply(response, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    await ctx.reply(`❌ Error: ${error.message}\n\nPlease try again or start a new chat with /newchat`);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('An error occurred. Please try again.');
});

// Start bot
console.log('🤖 Starting Telegram Bot for DeepSeek Harness...');
console.log(`📁 Sessions stored in: ${SESSIONS_DIR}`);
console.log(`🤖 Model: ${DSH_MODEL}`);

bot.launch()
  .then(() => {
    console.log('✅ Bot is running!');
    console.log('   Send /start on Telegram to begin');
  })
  .catch((err) => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  httpServer.close();
  bot.stop('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  httpServer.close();
  bot.stop('SIGTERM');
  process.exit(0);
});
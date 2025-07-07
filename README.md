# Building a Remote MCP Server on Cloudflare (Without Auth)

This example allows you to deploy a remote MCP server that doesn't require authentication on Cloudflare Workers. 

## Features

- **Calculator Tools**: Basic math operations (add, subtract, multiply, divide)
- **Web Search**: Internet search capabilities using Perplexity AI
- **Smart Text Analysis**: Automatically detects search intent in text and can trigger web searches

## Get started: 

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

This will deploy your MCP server to a URL like: `remote-mcp-server-authless.<your-account>.workers.dev/sse`

Alternatively, you can use the command line below to get the remote MCP Server created on your local machine:
```bash
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

## Setup

### Environment Variables

To use the web search functionality, you'll need to set up a Perplexity API key:

1. Get your API key from [Perplexity AI Settings](https://www.perplexity.ai/settings/api)
2. Set the environment variable in your Cloudflare Workers dashboard:
   - Go to your Workers dashboard
   - Select your worker
   - Go to Settings > Variables
   - Add a new variable: `PERPLEXITY_API_KEY` with your API key

### Available Tools

1. **add**: Simple addition of two numbers
2. **calculate**: Perform basic math operations (add, subtract, multiply, divide)
3. **search**: Search the internet using Perplexity AI
4. **analyze_text**: Analyze text for search intent and optionally perform automatic web searches

### Search Trigger Words

The `analyze_text` tool automatically detects these trigger words for web searches:
- search, find, look up
- what is, who is, where is, when is, how is  
- latest, current, recent, news
- information, details, about

## Customizing your MCP Server

To add your own [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/) to the MCP server, define each tool inside the `init()` method of `src/index.ts` using `this.server.tool(...)`. 

## Connect to Cloudflare AI Playground

You can connect to your MCP server from the Cloudflare AI Playground, which is a remote MCP client:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL (`remote-mcp-server-authless.<your-account>.workers.dev/sse`)
3. You can now use your MCP tools directly from the playground!

## Connect Claude Desktop to your MCP server

You can also connect to your remote MCP server from local MCP clients, by using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote). 

To connect to your MCP server from Claude Desktop, follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user) and within Claude Desktop go to Settings > Developer > Edit Config.

Update with this configuration:

```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"  // or remote-mcp-server-authless.your-account.workers.dev/sse
      ]
    }
  }
}
```

Restart Claude and you should see the tools become available. 

## Example Usage

Once connected, you can use the tools in various ways:

### Direct Web Search
```
Use the search tool to find information about "latest AI developments"
```

### Smart Text Analysis
```
Analyze this text: "What is the latest news about OpenAI?"
```
This will automatically detect search intent and perform a web search.

### Combined Operations
```
Calculate 25 * 4 and then search for information about that number
```

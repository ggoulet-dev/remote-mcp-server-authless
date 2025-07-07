import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import OpenAI from "openai";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "searching_mcp_tool",
		version: "1.0.0",
	});

	// Helper function to search with Perplexity using hybrid approach
	private async searchWithPerplexity(query: string, recency: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<string> {
		try {
			// Hardcoded API key for testing purposes
			const apiKey = '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';
			
			// Fallback to environment variable if needed
			const envApiKey = (this.env as any)?.PERPLEXITY_API_KEY;
			const finalApiKey = apiKey || envApiKey;
			
			if (!finalApiKey) {
				return 'Error: Perplexity API key not configured.';
			}

			// Use raw fetch for Perplexity-specific features
			const response = await fetch('https://api.perplexity.ai/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${finalApiKey}`
				},
				body: JSON.stringify({
					model: 'llama-3.1-sonar-small-128k-online',
					messages: [
						{
							role: 'system',
							content: 'You are a helpful assistant that provides concise, accurate information from recent web searches.'
						},
						{
							role: 'user',
							content: query
						}
					],
					max_tokens: 1000,
					temperature: 0.2,
					top_p: 0.9,
					return_citations: true,
					search_recency_filter: recency
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
			}

			const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
			return data.choices?.[0]?.message?.content || 'No search results found';
		} catch (error) {
			console.error('Error searching with Perplexity:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return `Error performing search: ${errorMessage}`;
		}
	}

	// Helper function to detect trigger words
	private detectTriggerWords(text: string): boolean {
		const triggerWords = [
			'search', 'find', 'look up', 'what is', 'who is', 'where is', 'when is', 'how is',
			'latest', 'current', 'recent', 'news', 'information', 'details', 'about'
		];
		
		const lowerText = text.toLowerCase();
		return triggerWords.some(word => lowerText.includes(word));
	}

	async init() {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);

		// Web search tool
		this.server.tool(
			"search",
			{
				query: z.string().describe("The search query to look up on the internet"),
				recency: z.enum(["day", "week", "month", "year"]).optional().default("month").describe("How recent the search results should be")
			},
			async ({ query, recency }) => {
				const searchResult = await this.searchWithPerplexity(query, recency);
				return {
					content: [
						{
							type: "text",
							text: `Search results for "${query}":\n\n${searchResult}`
						}
					]
				};
			}
		);

		// Smart text analyzer that can trigger web search
		this.server.tool(
			"analyze_text",
			{
				text: z.string().describe("Text to analyze for potential web search triggers"),
				auto_search: z.boolean().optional().default(true).describe("Whether to automatically perform web search if trigger words are detected")
			},
			async ({ text, auto_search }) => {
				const hasTriggerWords = this.detectTriggerWords(text);
				
				if (hasTriggerWords && auto_search) {
					// Extract potential search query from the text
					const searchQuery = text.replace(/^(search|find|look up|what is|who is|where is|when is|how is)\s*/i, '').trim();
					
					if (searchQuery) {
						const searchResult = await this.searchWithPerplexity(searchQuery);
						return {
							content: [
								{
									type: "text",
									text: `Detected search intent in: "${text}"\n\nSearch results:\n\n${searchResult}`
								}
							]
						};
					}
				}
				
				return {
					content: [
						{
							type: "text",
							text: hasTriggerWords 
								? `Detected potential search intent in: "${text}". Use the search tool for web results.`
								: `Analyzed text: "${text}". No search triggers detected.`
						}
					]
				};
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};

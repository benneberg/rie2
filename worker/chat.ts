import OpenAI from 'openai';
import type { Message, ToolCall } from './types';
import { getToolDefinitions, executeTool } from './tools';
import { RepositoryMetadata } from '../src/lib/rie-types';
import { ChatCompletionMessageFunctionToolCall } from 'openai/resources/index.mjs';
export class ChatHandler {
  private client: OpenAI;
  private model: string;
  constructor(aiGatewayUrl: string, apiKey: string, model: string) {
    this.client = new OpenAI({
      baseURL: aiGatewayUrl,
      apiKey: apiKey
    });
    this.model = model;
  }
  async processMessage(
    message: string,
    conversationHistory: Message[],
    onChunk?: (chunk: string) => void,
    metadata?: RepositoryMetadata
  ): Promise<{
    content: string;
    toolCalls?: ToolCall[];
  }> {
    try {
      const messages = this.buildConversationMessages(message, conversationHistory, metadata);
      const toolDefinitions = await getToolDefinitions();
      if (onChunk) {
        const stream = await this.client.chat.completions.create({
          model: this.model,
          messages,
          tools: toolDefinitions,
          tool_choice: 'auto',
          max_completion_tokens: 16000,
          stream: true,
        });
        return this.handleStreamResponse(stream, message, conversationHistory, onChunk, metadata);
      }
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: toolDefinitions,
        tool_choice: 'auto',
        max_tokens: 16000,
        stream: false
      });
      return this.handleNonStreamResponse(completion, message, conversationHistory, metadata);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('ChatHandler.processMessage OpenAI error:', errMsg);
      return { 
        content: `AI inference failed. Verify CF_AI_BASE_URL (should be Cloudflare AI Gateway like https://gateway.ai.cloudflare.com/v1/...), CF_AI_API_KEY, and model '${this.model}' is valid/deployed (recommend 'gpt-4o-mini' or '@cf/meta/llama-3.1-8b-instruct'). Fallback: message processed without augmentation.`, 
        toolCalls: undefined 
      };
    }
  }
  private async handleStreamResponse(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
    message: string,
    conversationHistory: Message[],
    onChunk: (chunk: string) => void,
    metadata?: RepositoryMetadata
  ) {
    let fullContent = '';
    const accumulatedToolCalls: ChatCompletionMessageFunctionToolCall[] = [];
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          onChunk(delta.content);
        }
        if (delta?.tool_calls) {
          for (let i = 0; i < delta.tool_calls.length; i++) {
            const deltaToolCall = delta.tool_calls[i];
            if (!accumulatedToolCalls[i]) {
              accumulatedToolCalls[i] = {
                id: deltaToolCall.id || `tool_${Date.now()}_${i}`,
                type: 'function',
                function: {
                  name: deltaToolCall.function?.name || '',
                  arguments: deltaToolCall.function?.arguments || ''
                }
              };
            } else {
              if (deltaToolCall.function?.name && !accumulatedToolCalls[i].function.name) {
                accumulatedToolCalls[i].function.name = deltaToolCall.function.name;
              }
              if (deltaToolCall.function?.arguments) {
                accumulatedToolCalls[i].function.arguments += deltaToolCall.function.arguments;
              }
            }
          }
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Stream processing error:', errMsg);
      throw new Error('Stream processing failed');
    }
    if (accumulatedToolCalls.length > 0) {
      const executedTools = await this.executeToolCalls(accumulatedToolCalls);
      const finalResponse = await this.generateToolResponse(message, conversationHistory, accumulatedToolCalls, executedTools, metadata);
      return { content: finalResponse, toolCalls: executedTools };
    }
    return { content: fullContent };
  }
  private async handleNonStreamResponse(
    completion: OpenAI.Chat.Completions.ChatCompletion,
    message: string,
    conversationHistory: Message[],
    metadata?: RepositoryMetadata
  ) {
    const responseMessage = completion.choices[0]?.message;
    if (!responseMessage) {
      return { content: 'I apologize, but I encountered an issue processing your request.' };
    }
    if (!responseMessage.tool_calls) {
      return {
        content: responseMessage.content || 'I apologize, but I encountered an issue.'
      };
    }
    const toolCalls = await this.executeToolCalls(responseMessage.tool_calls as ChatCompletionMessageFunctionToolCall[]);
    const finalResponse = await this.generateToolResponse(
      message,
      conversationHistory,
      responseMessage.tool_calls,
      toolCalls,
      metadata
    );
    return { content: finalResponse, toolCalls };
  }
  private async executeToolCalls(openAiToolCalls: ChatCompletionMessageFunctionToolCall[]): Promise<ToolCall[]> {
    return Promise.all(
      openAiToolCalls.map(async (tc) => {
        try {
          const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
          const result = await executeTool(tc.function.name, args);
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: args,
            result
          };
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`Tool execution failed for ${tc.function.name}:`, errMsg);
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: {},
            result: { error: `Failed to execute ${tc.function.name}: ${errMsg}` }
          };
        }
      })
    );
  }
  private async generateToolResponse(
    userMessage: string,
    history: Message[],
    openAiToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
    toolResults: ToolCall[],
    metadata?: RepositoryMetadata
  ): Promise<string> {
    const followUpCompletion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are the ArchLens Senior Architect. You provide sharp, technical insights.
          ${metadata ? `CONTEXT: Project: ${metadata.name}, Lang: ${metadata.primaryLanguage}, Health: ${metadata.validation?.score}%, Files: ${metadata.totalFiles}.` : ''}
          Maintain a professional yet slightly brutalist persona.`
        },
        ...history.slice(-3).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
        {
          role: 'assistant',
          content: null,
          tool_calls: openAiToolCalls
        },
        ...toolResults.map((result, index) => ({
          role: 'tool' as const,
          content: JSON.stringify(result.result),
          tool_call_id: openAiToolCalls[index]?.id || result.id
        }))
      ],
      max_tokens: 16000
    });
    return followUpCompletion.choices[0]?.message?.content || 'Tool results processed successfully.';
  }
  private buildConversationMessages(userMessage: string, history: Message[], metadata?: RepositoryMetadata) {
    const contextString = metadata ? `
    PROJECT_CONTEXT:
    Name: ${metadata.name}
    Primary Language: ${metadata.primaryLanguage}
    Health Score: ${metadata.validation?.score}% (${metadata.validation?.summaryBadge})
    Total Files: ${metadata.totalFiles}
    ` : '';

    return [
      {
        role: 'system' as const,
        content: `You are the ArchLens AI, a world-class Software Architect. ${contextString}
        Use the provided PROJECT_CONTEXT to answer user queries accurately. If asked about architecture, refer to the metadata.`
      },
      ...history.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user' as const, content: userMessage }
    ];
  }
  updateModel(newModel: string): void {
    this.model = newModel;
  }
}
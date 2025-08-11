# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Anki MCP (Model Context Protocol) Server that acts as a dynamic tool provider for AI assistants. It fetches tool definitions from an external API and exposes them via the MCP protocol.

## Key Commands

### Development

```bash
npm run dev      # Start development server with hot reload
npm start        # Run compiled server using tsx
```

### Build & Quality

```bash
npm run build    # Compile TypeScript to dist/
npm run lint     # Run Prettier check, ESLint, and TypeScript type checking
npm run format   # Auto-fix formatting issues
npm test         # Run tests with Vitest (no tests currently exist)
```

## Architecture

The server dynamically loads tools from an external API (configured via `API_URL` and `API_KEY` environment variables). Each tool is registered with the MCP server with proper parameter validation using Zod.

**Main Components:**

- `src/index.ts`: Entry point that creates the MCP server, fetches tools from API, and registers them with parameter validation
- Uses FastMCP framework for MCP protocol implementation
- Supports string, number, and array parameter types for tools
- Implements template-based prompts where `{paramName}` placeholders are replaced with actual values

**Tool Structure:**

```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  prompt: string; // Template with {placeholders}
  args?: Array<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'array';
  }>;
}
```

## Environment Setup

Create a `.env` file with:

```
API_URL=<your-api-url>
API_KEY=<your-api-key>
```

## CI/CD

The project uses GitHub Actions for CI/CD:

- **Push to main**: Runs lint, build, and semantic-release (publishes to npm)
- **Pull requests**: Runs lint checks

## Code Style

- Single quotes, no semicolons
- 80-character line width
- ESLint with Perfectionist plugin for alphabetical ordering
- Prettier for formatting

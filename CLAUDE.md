# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Exploro MCP (Model Context Protocol) Server that provides culinary data management tools for AI assistants. It exposes 15 tools across 4 categories: ingredients, dishes, tags, and menus management through the MCP protocol. The server also supports loading additional external tools dynamically.

## Key Commands

### Development

```bash
npm run dev      # Start development server with hot reload using FastMCP
npm start        # Run compiled server using tsx
```

### Build & Quality

```bash
npm run build    # Compile TypeScript to dist/
npm run lint     # Run Prettier check, ESLint, and TypeScript type checking
npm run format   # Auto-fix formatting issues with Prettier and ESLint
npm test         # Run tests with Vitest (no tests currently exist)
```

## Environment Setup

Create a `.env` file with:

```
EXPLORO_BASE_URL=http://localhost:3000
EXPLORO_API_KEY=your_api_key_here

# Optional: External tools API configuration
API_URL=https://your-api-endpoint.com/tools
API_KEY=your-external-api-key
```

## Architecture

The server implements a dual-tool strategy: **built-in Exploro tools** plus **dynamic external tools**.

### Core Components

- `src/index.ts`: Main entry point that creates the MCP server and registers all tools
- `src/types.ts`: TypeScript interfaces for external tool definitions
- Uses **FastMCP** framework for MCP protocol implementation
- **Zod** schemas provide strong validation with enum constraints for categories, statuses, and other structured data

### Tool Categories

**Built-in Exploro Tools (15 total):**
- **Ingredients (6)**: CRUD operations with price tracking and batch creation
- **Dishes (4)**: Recipe management with ingredients, tags, and instructions
- **Tags (2)**: Categorization system for dishes
- **Menus (3)**: Weekly menu planning with cost calculations

**Dynamic External Tools:**
- Loaded from `API_URL` endpoint if configured
- Template-based prompts where `{paramName}` placeholders are replaced with actual values
- Supports string, number, and array parameter types

### API Integration

All built-in tools make HTTP requests to the Exploro API using the `exploroApiRequest()` helper function. The server expects the Exploro API to provide RESTful endpoints for `/api/v1/ingredients`, `/api/v1/dishes`, `/api/v1/tags`, and `/api/v1/menus`.

### Validation Strategy

Strong enum validation enforces data consistency:
- **Ingredient categories**: `vegetables`, `meat`, `seafood`, `spices`, `dairy`, `grains`, `fruits`, `sauces`, `other`
- **Dish difficulty/status**: `easy/medium/hard`, `active/inactive`
- **Tag categories**: `cooking_method`, `meal_type`, `cuisine`, `dietary`, `occasion`, `flavor`
- **Meal groups**: `breakfast`, `lunch`, `dinner`, `snack`

## External Tool Structure

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

## CI/CD

The project uses GitHub Actions with semantic-release:

- **Push to main**: Runs lint, build, and publishes to npm as `@x-mcp/exploro`
- **Pull requests**: Runs lint checks only
- Tests are currently commented out but infrastructure exists with Vitest

## Code Style

- Single quotes, no semicolons
- ESLint with **Perfectionist plugin** enforces alphabetical ordering of object properties
- Prettier for formatting
- All enum values must be properly typed in Zod schemas

## important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
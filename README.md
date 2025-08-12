# Exploro MCP Server

An MCP (Model Context Protocol) server that provides tools for interacting with the Exploro culinary API. This server allows AI assistants to manage ingredients, dishes, tags, and menus through simple tool calls.

## Features

- **Ingredients Management**: List, create, update, and batch manage ingredients with price tracking
- **Dishes Management**: Create and manage dishes with ingredients, tags, and detailed instructions
- **Tags Management**: Create and list tags for categorizing dishes
- **Menus Management**: Create weekly menus with dish associations and cost calculations
- **Enum Validation**: Strong type validation for categories, units, and other structured data
- **Batch Operations**: Efficient bulk creation of ingredients and dishes
- **External Tools**: Support for dynamically loading additional tools from external APIs

## Available Tools

### Ingredients (8 tools)

1. **getIngredientCategories** - Get all available ingredient categories
2. **getIngredientUnits** - Get units with conversion factors and grouping
3. **listIngredients** - List ingredients with filtering and pagination
4. **createIngredient** - Create new ingredient with duplicate detection
5. **getIngredient** - Get single ingredient with price history
6. **updateIngredient** - Update ingredient with automatic price tracking
7. **deleteIngredient** - Delete ingredient (admin only)
8. **batchCreateIngredients** - Create up to 50 ingredients in one request

### Dishes (5 tools)

9. **getDishCategories** - Get dish categories including difficulty and meal groups
10. **listDishes** - List dishes with filtering by status, difficulty, tags, etc.
11. **createDish** - Create dish with ingredients, tags, and instructions
12. **getDish** - Get single dish with full details
13. **batchCreateDishes** - Create up to 20 dishes in one request

### Tags (3 tools)

14. **getTagCategories** - Get all available tag categories for classification
15. **listTags** - List all tags with usage counts
16. **createTag** - Create new tags for dish categorization

### Menus (3 tools)

17. **listMenus** - List menus with cost calculations and filtering
18. **createMenu** - Create menu with dish associations
19. **getMenu** - Get single menu with full details and costs

## Installation

```bash
npm install -g @x-mcp/exploro
# or
pnpm add -g @x-mcp/exploro
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode (auto-restart on changes)
npm run dev

# Run the server
npm start

# Lint and format code
npm run lint
npm run format
```

## Configuration

### MCP Client Configuration

Add this to your MCP client settings:

```json
{
  "mcpServers": {
    "exploro-mcp": {
      "command": "npx",
      "args": ["-y", "@x-mcp/exploro@latest"],
      "env": {
        "EXPLORO_BASE_URL": "http://localhost:3000", // Exploro API base URL
        "EXPLORO_API_KEY": "your_api_key_here" // Your Exploro API key
      }
    }
  }
}
```

### Environment Variables

Create a `.env` file:

```bash
# Required: Exploro API configuration
EXPLORO_BASE_URL=http://localhost:3000
EXPLORO_API_KEY=your_api_key_here

# Optional: External tools API configuration
API_URL=https://your-api-endpoint.com/tools
API_KEY=your-external-api-key
```

## Usage Examples

Once configured, the AI assistant can use commands like:

**Ingredients:**

- "List all vegetables in the database"
- "Create a new ingredient: tomatoes, 25000 VND per kg"
- "Update the price of beef to 300000 VND per kg"
- "Show me the price history for rice"

**Dishes:**

- "Create a new dish: Pho Bo with beef and rice noodles"
- "List all easy difficulty dishes"
- "Show me all Vietnamese soup dishes"
- "Add 20 traditional Vietnamese dishes in batch"

**Menus:**

- "Create a weekly menu for 4 people"
- "Show me the total cost for this week's menu"
- "List all public menus"

Each tool makes direct HTTP requests to the Exploro API and returns structured response data.

## Supported Enum Values

### Ingredient Categories

`vegetables`, `meat`, `seafood`, `spices`, `dairy`, `grains`, `fruits`, `sauces`, `other`

### Dish Difficulty

`easy`, `medium`, `hard`

### Dish Status

`active`, `inactive`

### Tag Categories

`cooking_method`, `meal_type`, `cuisine`, `dietary`, `occasion`, `flavor`, `temperature`, `texture`

### Meal Groups

`breakfast`, `lunch`, `dinner`, `snack`

### Menu Visibility

`private`, `public`

## API Requirements

The tools interact with the Exploro API which should have these endpoints:

**Ingredients:**

- `GET /api/v1/ingredients` - List ingredients
- `POST /api/v1/ingredients` - Create ingredient
- `GET /api/v1/ingredients/{id}` - Get single ingredient
- `PUT /api/v1/ingredients/{id}` - Update ingredient
- `DELETE /api/v1/ingredients/{id}` - Delete ingredient
- `POST /api/v1/ingredients/batch` - Batch create ingredients

**Dishes:**

- `GET /api/v1/dishes` - List dishes
- `POST /api/v1/dishes` - Create dish
- `GET /api/v1/dishes/{id}` - Get single dish
- `POST /api/v1/dishes/batch` - Batch create dishes

**Tags:**

- `GET /api/v1/tags` - List tags
- `POST /api/v1/tags` - Create tag

**Menus:**

- `GET /api/v1/menus` - List menus
- `POST /api/v1/menus` - Create menu
- `GET /api/v1/menus/{id}` - Get single menu

## License

MIT

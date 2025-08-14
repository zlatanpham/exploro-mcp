#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';

import { Tool } from './types.js';
dotenv.config();

const server = new FastMCP({
  name: 'exploro-mcp',
  version: '1.0.1',
});

// Get Exploro API configuration from environment
const EXPLORO_BASE_URL =
  process.env.EXPLORO_BASE_URL || 'http://localhost:3000';
const EXPLORO_API_KEY = process.env.EXPLORO_API_KEY;

if (!EXPLORO_API_KEY) {
  console.warn(
    'EXPLORO_API_KEY not set. Exploro tools will not work properly.',
  );
}

// Helper function to make API requests
async function exploroApiRequest(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
  queryParams?: Record<
    string,
    boolean | number | string | string[] | undefined
  >,
) {
  const url = new URL(`${EXPLORO_BASE_URL}${endpoint}`);

  // Add query parameters if provided
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, String(v)));
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    });
  }

  const options: RequestInit = {
    headers: {
      Authorization: `Bearer ${EXPLORO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);
  const data = (await response.json()) as unknown;

  if (!response.ok) {
    const errorData = data as { error?: { message?: string } };
    throw new Error(
      errorData.error?.message || `API request failed: ${response.statusText}`,
    );
  }

  return data;
}

// 1. Get Ingredient Categories Tool
server.addTool({
  description: 'Get all available ingredient categories for classification',
  execute: async () => {
    try {
      const data = await exploroApiRequest(
        'GET',
        '/api/v1/ingredients/categories',
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'get_ingredient_categories',
  parameters: z.object({}),
});

// 2. Get Ingredient Units Tool
server.addTool({
  description:
    'Get all available units for ingredient measurements with conversion factors',
  execute: async args => {
    try {
      const queryParams: Record<string, boolean | string> = {};
      if (args.category !== undefined) queryParams.category = args.category;
      if (args.grouped !== undefined) queryParams.grouped = args.grouped;

      const data = await exploroApiRequest(
        'GET',
        '/api/v1/ingredients/units',
        undefined,
        queryParams,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'get_ingredient_units',
  parameters: z.object({
    category: z
      .enum(['mass', 'volume', 'count', 'bundle', 'cooking'])
      .optional()
      .describe('Filter by unit category'),
    grouped: z
      .boolean()
      .optional()
      .describe('Return units grouped by category'),
  }),
});

// 3. List Ingredients Tool
server.addTool({
  description: 'List all ingredients with optional filtering and pagination',
  execute: async args => {
    try {
      const queryParams: Record<string, boolean | number | string> = {};
      if (args.search !== undefined) queryParams.search = args.search;
      if (args.category !== undefined) queryParams.category = args.category;
      if (args.seasonal !== undefined) queryParams.seasonal = args.seasonal;
      if (args.limit !== undefined) queryParams.limit = args.limit;
      if (args.offset !== undefined) queryParams.offset = args.offset;

      const data = await exploroApiRequest(
        'GET',
        '/api/v1/ingredients',
        undefined,
        queryParams,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'list_ingredients',
  parameters: z.object({
    category: z
      .enum([
        'vegetables',
        'meat',
        'seafood',
        'spices',
        'dairy',
        'grains',
        'fruits',
        'sauces',
        'other',
      ])
      .optional()
      .describe('Filter by ingredient category'),
    limit: z
      .number()
      .optional()
      .describe('Number of results (default: 50, max: 200)'),
    offset: z.number().optional().describe('Number of results to skip'),
    search: z
      .string()
      .optional()
      .describe('Search in Vietnamese and English names'),
    seasonal: z.boolean().optional().describe('Filter seasonal ingredients'),
  }),
});

// 4. Create Ingredient Tool
server.addTool({
  description: 'Create a new ingredient with automatic duplicate detection',
  execute: async args => {
    try {
      const ingredientData: Record<string, unknown> = {
        current_price: args.current_price,
        name_vi: args.name_vi,
        seasonal_flag: args.seasonal_flag || false,
      };

      // Add optional fields
      if (args.name_en !== undefined) ingredientData.name_en = args.name_en;
      if (args.density !== undefined) ingredientData.density = args.density;

      // Handle legacy and new category/unit fields
      if (args.category_id !== undefined) {
        ingredientData.category_id = args.category_id;
      } else if (args.category !== undefined) {
        ingredientData.category = args.category;
      }

      // unit_id is now required
      if (args.unit_id !== undefined) {
        ingredientData.unit_id = args.unit_id;
      } else if (args.default_unit !== undefined) {
        // Fallback to legacy field for backward compatibility
        ingredientData.default_unit = args.default_unit;
      } else {
        throw new Error('unit_id is required for ingredient creation');
      }

      const data = await exploroApiRequest('POST', '/api/v1/ingredients', {
        ingredient: ingredientData,
      });
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'create_ingredient',
  parameters: z.object({
    category: z
      .enum([
        'vegetables',
        'meat',
        'seafood',
        'spices',
        'dairy',
        'grains',
        'fruits',
        'sauces',
        'other',
      ])
      .optional()
      .describe('Ingredient category (legacy - use category_id instead)'),
    category_id: z
      .string()
      .optional()
      .describe('Foreign key to ingredient category'),
    current_price: z
      .number()
      .positive()
      .describe('Current price of the ingredient'),
    default_unit: z
      .string()
      .optional()
      .describe(
        'Default unit for the ingredient (legacy - use unit_id instead)',
      ),
    density: z
      .number()
      .optional()
      .describe('Density in g/ml for mass-volume conversion'),
    name_en: z.string().optional().describe('English name of the ingredient'),
    name_vi: z.string().describe('Vietnamese name of the ingredient'),
    seasonal_flag: z
      .boolean()
      .optional()
      .describe('Whether the ingredient is seasonal'),
    unit_id: z.string().describe('REQUIRED - Foreign key to unit'),
  }),
});

// 5. Get Single Ingredient Tool
server.addTool({
  description: 'Get a single ingredient with price history',
  execute: async args => {
    try {
      const data = await exploroApiRequest(
        'GET',
        `/api/v1/ingredients/${args.id}`,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'get_ingredient',
  parameters: z.object({
    id: z.string().describe('ID of the ingredient to retrieve'),
  }),
});

// 6. Update Ingredient Tool
server.addTool({
  description:
    'Update ingredient details with automatic price history tracking',
  execute: async args => {
    try {
      const updateData: Record<string, unknown> = {};
      if (args.name_vi !== undefined) updateData.name_vi = args.name_vi;
      if (args.name_en !== undefined) updateData.name_en = args.name_en;
      if (args.category !== undefined) updateData.category = args.category;
      if (args.default_unit !== undefined)
        updateData.default_unit = args.default_unit;
      if (args.current_price !== undefined)
        updateData.current_price = args.current_price;
      if (args.seasonal_flag !== undefined)
        updateData.seasonal_flag = args.seasonal_flag;

      const data = await exploroApiRequest(
        'PUT',
        `/api/v1/ingredients/${args.id}`,
        { ingredient: updateData },
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'update_ingredient',
  parameters: z.object({
    category: z
      .enum([
        'vegetables',
        'meat',
        'seafood',
        'spices',
        'dairy',
        'grains',
        'fruits',
        'sauces',
        'other',
      ])
      .optional()
      .describe('Ingredient category'),
    current_price: z
      .number()
      .positive()
      .optional()
      .describe('Current price of the ingredient'),
    default_unit: z
      .string()
      .optional()
      .describe('Default unit for the ingredient'),
    id: z.string().describe('ID of the ingredient to update'),
    name_en: z.string().optional().describe('English name of the ingredient'),
    name_vi: z
      .string()
      .optional()
      .describe('Vietnamese name of the ingredient'),
    seasonal_flag: z
      .boolean()
      .optional()
      .describe('Whether the ingredient is seasonal'),
  }),
});

// 7. Delete Ingredient Tool
server.addTool({
  description: 'Delete an ingredient (requires admin permission)',
  execute: async args => {
    try {
      const data = await exploroApiRequest(
        'DELETE',
        `/api/v1/ingredients/${args.id}`,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'delete_ingredient',
  parameters: z.object({
    id: z.string().describe('ID of the ingredient to delete'),
  }),
});

// 8. Batch Create Ingredients Tool
server.addTool({
  description: 'Create up to 50 ingredients in a single request',
  execute: async args => {
    try {
      const data = await exploroApiRequest(
        'POST',
        '/api/v1/ingredients/batch',
        {
          ingredients: args.ingredients,
        },
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'batch_create_ingredients',
  parameters: z.object({
    ingredients: z
      .array(
        z.object({
          category: z
            .enum([
              'vegetables',
              'meat',
              'seafood',
              'spices',
              'dairy',
              'grains',
              'fruits',
              'sauces',
              'other',
            ])
            .optional()
            .describe('Ingredient category (legacy - use category_id instead)'),
          category_id: z
            .string()
            .optional()
            .describe('Foreign key to ingredient category'),
          current_price: z
            .number()
            .positive()
            .describe('Current price of the ingredient'),
          default_unit: z
            .string()
            .optional()
            .describe(
              'Default unit for the ingredient (legacy - use unit_id instead)',
            ),
          density: z
            .number()
            .optional()
            .describe('Density in g/ml for mass-volume conversion'),
          name_en: z
            .string()
            .optional()
            .describe('English name of the ingredient'),
          name_vi: z.string().describe('Vietnamese name of the ingredient'),
          seasonal_flag: z
            .boolean()
            .optional()
            .describe('Whether the ingredient is seasonal'),
          unit_id: z.string().describe('REQUIRED - Foreign key to unit'),
        }),
      )
      .max(50)
      .describe('Array of ingredients to create (max 50)'),
  }),
});

// Dishes Management Tools

// 9. Get Dish Categories Tool
server.addTool({
  description:
    'Get all dish category options including difficulty levels, status options, and meal groups',
  execute: async args => {
    try {
      const queryParams: Record<string, string> = {};
      if (args.type !== undefined) queryParams.type = args.type;

      const data = await exploroApiRequest(
        'GET',
        '/api/v1/dishes/categories',
        undefined,
        queryParams,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'get_dish_categories',
  parameters: z.object({
    type: z
      .enum(['difficulty', 'status', 'meal_groups'])
      .optional()
      .describe('Get specific category type'),
  }),
});

// 10. List Dishes Tool
server.addTool({
  description: 'List all dishes with optional filtering and pagination',
  execute: async args => {
    try {
      const queryParams: Record<
        string,
        boolean | number | string | string[] | undefined
      > = {};
      if (args.status !== undefined) queryParams.status = args.status;
      if (args.difficulty !== undefined)
        queryParams.difficulty = args.difficulty;
      if (args.max_cook_time !== undefined)
        queryParams.max_cook_time = args.max_cook_time;
      if (args.tags !== undefined) queryParams.tags = args.tags;
      if (args.search !== undefined) queryParams.search = args.search;
      if (args.include_ingredients !== undefined)
        queryParams.include_ingredients = args.include_ingredients;
      if (args.limit !== undefined) queryParams.limit = args.limit;
      if (args.offset !== undefined) queryParams.offset = args.offset;

      const data = await exploroApiRequest(
        'GET',
        '/api/v1/dishes',
        undefined,
        queryParams,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'list_dishes',
  parameters: z.object({
    difficulty: z
      .string()
      .optional()
      .describe('Filter by difficulty (easy, medium, hard)'),
    include_ingredients: z
      .boolean()
      .optional()
      .describe('Include full ingredient details'),
    limit: z
      .number()
      .optional()
      .describe('Number of results (default: 50, max: 200)'),
    max_cook_time: z
      .number()
      .optional()
      .describe('Maximum cooking time in minutes'),
    offset: z.number().optional().describe('Number of results to skip'),
    search: z.string().optional().describe('Search in names and descriptions'),
    status: z
      .enum(['active', 'inactive', 'all'])
      .optional()
      .describe('Filter by status'),
    tags: z.array(z.string()).optional().describe('Filter by tag IDs'),
  }),
});

// 11. Create Dish Tool
server.addTool({
  description: 'Create a new dish with ingredient associations and tags',
  execute: async args => {
    try {
      const data = await exploroApiRequest('POST', '/api/v1/dishes', {
        dish: {
          cook_time: args.cook_time,
          description_en: args.description_en,
          description_vi: args.description_vi,
          difficulty: args.difficulty,
          image_url: args.image_url,
          instructions_en: args.instructions_en,
          instructions_vi: args.instructions_vi,
          name_en: args.name_en,
          name_vi: args.name_vi,
          prep_time: args.prep_time,
          servings: args.servings,
          source_url: args.source_url,
          status: args.status || 'active',
        },
        ingredients: args.ingredients || [],
        tags: args.tags || [],
      });
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'create_dish',
  parameters: z.object({
    cook_time: z.number().positive().describe('Cooking time in minutes'),
    description_en: z
      .string()
      .optional()
      .describe('English description of the dish'),
    description_vi: z.string().describe('Vietnamese description of the dish'),
    difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
    image_url: z.string().url().optional().describe('Image URL'),
    ingredients: z
      .array(
        z.object({
          ingredient_id: z.string().describe('ID of the ingredient'),
          notes: z.string().optional().describe('Additional notes'),
          optional: z
            .boolean()
            .optional()
            .describe('Whether ingredient is optional'),
          quantity: z.number().positive().describe('Quantity needed'),
          unit_id: z.string().describe('REQUIRED - Foreign key to unit'),
        }),
      )
      .optional()
      .describe('Array of ingredients for the dish'),
    instructions_en: z
      .string()
      .optional()
      .describe('English cooking instructions'),
    instructions_vi: z.string().describe('Vietnamese cooking instructions'),
    name_en: z.string().optional().describe('English name of the dish'),
    name_vi: z.string().describe('Vietnamese name of the dish'),
    prep_time: z.number().optional().describe('Preparation time in minutes'),
    servings: z.number().positive().describe('Number of servings'),
    source_url: z.string().url().describe('Recipe source URL'),
    status: z.enum(['active', 'inactive']).optional().describe('Dish status'),
    tags: z.array(z.string()).describe('Array of tag IDs'),
  }),
});

// 12. Get Single Dish Tool
server.addTool({
  description:
    'Get a single dish with full details including ingredients and tags',
  execute: async args => {
    try {
      const data = await exploroApiRequest('GET', `/api/v1/dishes/${args.id}`);
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'get_dish',
  parameters: z.object({
    id: z.string().describe('ID of the dish to retrieve'),
  }),
});

// 13. Update Dish Tool
server.addTool({
  description: 'Update dish details with ingredient associations and tags',
  execute: async args => {
    try {
      const updateData: Record<string, unknown> = {};
      if (args.name_vi !== undefined) updateData.name_vi = args.name_vi;
      if (args.name_en !== undefined) updateData.name_en = args.name_en;
      if (args.description_vi !== undefined)
        updateData.description_vi = args.description_vi;
      if (args.description_en !== undefined)
        updateData.description_en = args.description_en;
      if (args.instructions_vi !== undefined)
        updateData.instructions_vi = args.instructions_vi;
      if (args.instructions_en !== undefined)
        updateData.instructions_en = args.instructions_en;
      if (args.difficulty !== undefined)
        updateData.difficulty = args.difficulty;
      if (args.cook_time !== undefined) updateData.cook_time = args.cook_time;
      if (args.prep_time !== undefined) updateData.prep_time = args.prep_time;
      if (args.servings !== undefined) updateData.servings = args.servings;
      if (args.image_url !== undefined) updateData.image_url = args.image_url;
      if (args.source_url !== undefined)
        updateData.source_url = args.source_url;
      if (args.status !== undefined) updateData.status = args.status;

      const requestBody: Record<string, unknown> = { dish: updateData };
      if (args.ingredients !== undefined)
        requestBody.ingredients = args.ingredients;
      if (args.tags !== undefined) requestBody.tags = args.tags;

      const data = await exploroApiRequest(
        'PUT',
        `/api/v1/dishes/${args.id}`,
        requestBody,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'update_dish',
  parameters: z.object({
    cook_time: z
      .number()
      .positive()
      .optional()
      .describe('Cooking time in minutes'),
    description_en: z
      .string()
      .optional()
      .describe('English description of the dish'),
    description_vi: z
      .string()
      .optional()
      .describe('Vietnamese description of the dish'),
    difficulty: z
      .enum(['easy', 'medium', 'hard'])
      .optional()
      .describe('Difficulty level'),
    id: z.string().describe('ID of the dish to update'),
    image_url: z.string().url().optional().describe('Image URL'),
    ingredients: z
      .array(
        z.object({
          ingredient_id: z.string().describe('ID of the ingredient'),
          notes: z.string().optional().describe('Additional notes'),
          optional: z
            .boolean()
            .optional()
            .describe('Whether ingredient is optional'),
          quantity: z.number().positive().describe('Quantity needed'),
          unit_id: z.string().describe('REQUIRED - Foreign key to unit'),
        }),
      )
      .optional()
      .describe('Array of ingredients for the dish'),
    instructions_en: z
      .string()
      .optional()
      .describe('English cooking instructions'),
    instructions_vi: z
      .string()
      .optional()
      .describe('Vietnamese cooking instructions'),
    name_en: z.string().optional().describe('English name of the dish'),
    name_vi: z.string().optional().describe('Vietnamese name of the dish'),
    prep_time: z.number().optional().describe('Preparation time in minutes'),
    servings: z.number().positive().optional().describe('Number of servings'),
    source_url: z.string().url().optional().describe('Recipe source URL'),
    status: z.enum(['active', 'inactive']).optional().describe('Dish status'),
    tags: z.array(z.string()).optional().describe('Array of tag IDs'),
  }),
});

// 14. Delete Dish Tool
server.addTool({
  description: 'Delete a dish (requires admin permission)',
  execute: async args => {
    try {
      const data = await exploroApiRequest(
        'DELETE',
        `/api/v1/dishes/${args.id}`,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'delete_dish',
  parameters: z.object({
    id: z.string().describe('ID of the dish to delete'),
  }),
});

// 15. Batch Create Dishes Tool
server.addTool({
  description: 'Create up to 20 dishes in a single request',
  execute: async args => {
    try {
      const data = await exploroApiRequest('POST', '/api/v1/dishes/batch', {
        dishes: args.dishes,
      });
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'batch_create_dishes',
  parameters: z.object({
    dishes: z
      .array(
        z.object({
          dish: z.object({
            cook_time: z
              .number()
              .positive()
              .describe('Cooking time in minutes'),
            description_en: z
              .string()
              .optional()
              .describe('English description'),
            description_vi: z.string().describe('Vietnamese description'),
            difficulty: z
              .enum(['easy', 'medium', 'hard'])
              .describe('Difficulty level'),
            image_url: z.string().url().optional().describe('Image URL'),
            instructions_en: z
              .string()
              .optional()
              .describe('English instructions'),
            instructions_vi: z.string().describe('Vietnamese instructions'),
            name_en: z.string().optional().describe('English name of the dish'),
            name_vi: z.string().describe('Vietnamese name of the dish'),
            prep_time: z
              .number()
              .optional()
              .describe('Preparation time in minutes'),
            servings: z
              .number()
              .positive()
              .optional()
              .describe('Number of servings'),
            source_url: z
              .string()
              .url()
              .optional()
              .describe('Recipe source URL'),
            status: z
              .enum(['active', 'inactive'])
              .optional()
              .describe('Dish status'),
          }),
          ingredients: z
            .array(
              z.object({
                ingredient_id: z.string().describe('ID of the ingredient'),
                notes: z.string().optional().describe('Additional notes'),
                optional: z
                  .boolean()
                  .optional()
                  .describe('Whether ingredient is optional'),
                quantity: z.number().positive().describe('Quantity needed'),
                unit_id: z.string().describe('REQUIRED - Foreign key to unit'),
              }),
            )
            .optional()
            .describe('Array of ingredients'),
          tags: z.array(z.string()).optional().describe('Array of tag IDs'),
        }),
      )
      .max(20)
      .describe('Array of dishes to create (max 20)'),
  }),
});

// Tags Management Tools

// 16. Get Tag Categories Tool
server.addTool({
  description: 'Get all available tag categories for dish classification',
  execute: async () => {
    try {
      const data = await exploroApiRequest('GET', '/api/v1/tags/categories');
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'get_tag_categories',
  parameters: z.object({}),
});

// 17. List Tags Tool
server.addTool({
  description: 'List all available tags with usage count',
  execute: async args => {
    try {
      const queryParams: Record<string, string> = {};
      if (args.category !== undefined) queryParams.category = args.category;

      const data = await exploroApiRequest(
        'GET',
        '/api/v1/tags',
        undefined,
        queryParams,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'list_tags',
  parameters: z.object({
    category: z
      .enum([
        'cooking_method',
        'meal_type',
        'cuisine',
        'dietary',
        'occasion',
        'flavor',
        'temperature',
        'texture',
      ])
      .optional()
      .describe('Filter by tag category'),
  }),
});

// 18. Create Tag Tool
server.addTool({
  description: 'Create a new tag',
  execute: async args => {
    try {
      const data = await exploroApiRequest('POST', '/api/v1/tags', {
        tag: {
          category: args.category,
          name_en: args.name_en,
          name_vi: args.name_vi,
        },
      });
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'create_tag',
  parameters: z.object({
    category: z
      .enum([
        'cooking_method',
        'meal_type',
        'cuisine',
        'dietary',
        'occasion',
        'flavor',
        'temperature',
        'texture',
      ])
      .optional()
      .describe('Tag category'),
    name_en: z.string().optional().describe('English name of the tag'),
    name_vi: z.string().describe('Vietnamese name of the tag'),
  }),
});

// Menus Management Tools

// 19. List Menus Tool
server.addTool({
  description: 'List menus with cost calculation and optional filtering',
  execute: async args => {
    try {
      const queryParams: Record<string, number | string> = {};
      if (args.visibility !== undefined)
        queryParams.visibility = args.visibility;
      if (args.start_date !== undefined)
        queryParams.start_date = args.start_date;
      if (args.end_date !== undefined) queryParams.end_date = args.end_date;
      if (args.limit !== undefined) queryParams.limit = args.limit;
      if (args.offset !== undefined) queryParams.offset = args.offset;

      const data = await exploroApiRequest(
        'GET',
        '/api/v1/menus',
        undefined,
        queryParams,
      );
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'list_menus',
  parameters: z.object({
    end_date: z
      .string()
      .optional()
      .describe('Filter menus ending before this date (ISO 8601)'),
    limit: z
      .number()
      .optional()
      .describe('Number of results (default: 50, max: 200)'),
    offset: z.number().optional().describe('Number of results to skip'),
    start_date: z
      .string()
      .optional()
      .describe('Filter menus starting after this date (ISO 8601)'),
    visibility: z
      .string()
      .optional()
      .describe('Filter by visibility (private, public)'),
  }),
});

// 20. Create Menu Tool
server.addTool({
  description: 'Create a new menu with dish associations',
  execute: async args => {
    try {
      const data = await exploroApiRequest('POST', '/api/v1/menus', {
        dishes: args.dishes || [],
        menu: {
          description: args.description,
          end_date: args.end_date,
          name: args.name,
          servings: args.servings || 4,
          start_date: args.start_date,
          visibility: args.visibility || 'private',
        },
      });
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'create_menu',
  parameters: z.object({
    description: z.string().optional().describe('Description of the menu'),
    dishes: z
      .array(
        z.object({
          day_index: z
            .number()
            .min(0)
            .max(6)
            .optional()
            .describe('Day index (0-6, Monday-Sunday)'),
          dish_id: z.string().describe('ID of the dish'),
          meal_group: z
            .enum(['breakfast', 'lunch', 'dinner', 'snack'])
            .optional()
            .describe('Meal group'),
          order_index: z
            .number()
            .optional()
            .describe('Order index (default: 0)'),
          quantity: z
            .number()
            .positive()
            .optional()
            .describe('Quantity (default: 1)'),
        }),
      )
      .optional()
      .describe('Array of dishes to include in the menu'),
    end_date: z.string().optional().describe('End date (ISO 8601)'),
    name: z.string().describe('Name of the menu'),
    servings: z
      .number()
      .positive()
      .optional()
      .describe('Number of servings (default: 4)'),
    start_date: z.string().optional().describe('Start date (ISO 8601)'),
    visibility: z
      .enum(['private', 'public'])
      .optional()
      .describe('Menu visibility (default: private)'),
  }),
});

// 21. Get Single Menu Tool
server.addTool({
  description:
    'Get a single menu with full details including dishes and cost calculation',
  execute: async args => {
    try {
      const data = await exploroApiRequest('GET', `/api/v1/menus/${args.id}`);
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  name: 'get_menu',
  parameters: z.object({
    id: z.string().describe('ID of the menu to retrieve'),
  }),
});

// Load additional tools from external API if configured
async function loadExternalTools() {
  const API_URL = process.env.API_URL;
  const API_KEY = process.env.API_KEY;

  if (!API_URL || !API_KEY) {
    return;
  }

  try {
    const response = await fetch(API_URL, {
      headers: {
        'x-api-key': API_KEY,
      },
      method: 'GET',
    });

    if (!response.ok) {
      console.warn(`Failed to fetch external tools: ${response.statusText}`);
      return;
    }

    const tools = (await response.json()) as Tool[];

    // Register external tools
    tools.forEach(tool => {
      server.addTool({
        description: tool.description,
        execute: async args => {
          return tool.prompt.replace(/{(\w+)}/g, (_: string, key: string) => {
            if (key in args) {
              if (Array.isArray(args[key])) {
                return args[key].map((item: string) => `"${item}"`).join(', ');
              }
              return args[key];
            }
            return `{${key}}`;
          });
        },
        name: tool.name,
        parameters: z.object(
          (tool.args || []).reduce(
            (
              acc: Record<string, z.ZodTypeAny>,
              arg: NonNullable<Tool['args']>[0],
            ) => {
              let argType: z.ZodTypeAny;

              if (arg.type === 'array') {
                argType = z.array(z.string()).describe(arg.description);
              } else if (arg.type === 'number') {
                argType = z.number().describe(arg.description);
              } else if (arg.type === 'string') {
                argType = z.string().describe(arg.description);
              } else {
                throw new Error(`Unsupported argument type: ${arg.type}`);
              }

              acc[arg.name] = argType;
              return acc;
            },
            {} as Record<string, z.ZodTypeAny>,
          ),
        ),
      });
    });

    console.error(`Loaded ${tools.length} external tools`);
  } catch (error) {
    console.error('Failed to load external tools:', error);
  }
}

// Load external tools
loadExternalTools();

// Add example resource
server.addResource({
  async load() {
    return {
      text: 'Exploro MCP Server - Ready to manage your culinary data!',
    };
  },
  mimeType: 'text/plain',
  name: 'Server Status',
  uri: 'exploro://status',
});

// Start server
server.start({
  transportType: 'stdio',
});

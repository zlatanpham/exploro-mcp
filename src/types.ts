export interface Tool {
  args?: Array<{
    description: string;
    name: string;
    type: 'array' | 'number' | 'string';
  }>;
  description: string;
  id: string;
  name: string;
  prompt: string;
}

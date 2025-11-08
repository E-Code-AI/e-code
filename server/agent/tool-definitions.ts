/**
 * AI Agent Tool Definitions
 * Comprehensive tool schemas for autonomous agent capabilities
 * Identical to Replit Agent v3 functionality
 */

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * File System Tools
 */
export const fileTools: AgentTool[] = [
  {
    name: 'create_file',
    description: 'Create a new file with specified content. Use this to create new source files, configs, or documentation.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative file path from project root (e.g., "src/components/Button.tsx")'
        },
        content: {
          type: 'string',
          description: 'Complete file content to write'
        },
        description: {
          type: 'string',
          description: 'Brief description of what this file does (for user visibility)'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'edit_file',
    description: 'Modify an existing file by replacing old content with new content. Use for targeted edits.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative file path from project root'
        },
        old_content: {
          type: 'string',
          description: 'Exact content to replace (must match exactly including whitespace)'
        },
        new_content: {
          type: 'string',
          description: 'New content to insert in place of old content'
        },
        description: {
          type: 'string',
          description: 'Brief description of what this edit does'
        }
      },
      required: ['path', 'old_content', 'new_content']
    }
  },
  {
    name: 'read_file',
    description: 'Read the complete contents of a file to understand its current state.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative file path from project root'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the project. Use with caution.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative file path from project root'
        },
        reason: {
          type: 'string',
          description: 'Why this file is being deleted'
        }
      },
      required: ['path', 'reason']
    }
  },
  {
    name: 'list_directory',
    description: 'List all files and folders in a directory to understand project structure.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path to list (default: "." for root)'
        },
        recursive: {
          type: 'boolean',
          description: 'Whether to list subdirectories recursively'
        }
      },
      required: ['path']
    }
  }
];

/**
 * Command Execution Tools
 */
export const commandTools: AgentTool[] = [
  {
    name: 'run_command',
    description: 'Execute a shell command in the project terminal. Use for installing packages, running builds, tests, etc.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to execute (e.g., "npm install react", "npm run build")'
        },
        description: {
          type: 'string',
          description: 'What this command does and why it\'s needed'
        },
        timeout: {
          type: 'number',
          description: 'Maximum execution time in milliseconds (default: 30000)'
        }
      },
      required: ['command', 'description']
    }
  },
  {
    name: 'install_package',
    description: 'Install an npm package to the project. Automatically runs npm install.',
    parameters: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'Package name (e.g., "react-router-dom", "axios")'
        },
        dev: {
          type: 'boolean',
          description: 'Install as dev dependency (default: false)'
        },
        version: {
          type: 'string',
          description: 'Specific version to install (optional)'
        }
      },
      required: ['package_name']
    }
  }
];

/**
 * Search and Analysis Tools
 */
export const searchTools: AgentTool[] = [
  {
    name: 'web_search',
    description: 'Search the internet for current information, documentation, or solutions. Use when you need up-to-date information.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "React hooks best practices 2024", "TypeScript error handling patterns")'
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'search_code',
    description: 'Search for specific code patterns in the project files using grep.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Code pattern to search for (regex supported)'
        },
        file_pattern: {
          type: 'string',
          description: 'File pattern to search in (e.g., "*.ts", "**/*.tsx")'
        }
      },
      required: ['pattern']
    }
  }
];

/**
 * Project Context Tools
 */
export const contextTools: AgentTool[] = [
  {
    name: 'get_project_structure',
    description: 'Get a complete overview of the project structure including files, folders, and technologies used.',
    parameters: {
      type: 'object',
      properties: {
        include_content: {
          type: 'boolean',
          description: 'Whether to include file contents for key files (package.json, etc.)'
        }
      }
    }
  },
  {
    name: 'get_diagnostics',
    description: 'Get current errors, warnings, and diagnostics from the project (TypeScript, ESLint, etc.).',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Specific file to get diagnostics for (optional, defaults to all files)'
        }
      }
    }
  }
];

/**
 * All Tools Combined
 */
export const allTools: AgentTool[] = [
  ...fileTools,
  ...commandTools,
  ...searchTools,
  ...contextTools
];

/**
 * Convert tools to OpenAI function calling format
 */
export function toOpenAITools(tools: AgentTool[]) {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

/**
 * Convert tools to Anthropic tool format
 */
export function toAnthropicTools(tools: AgentTool[]) {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}

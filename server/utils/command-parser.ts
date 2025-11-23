import { parse as parseShellCommand } from 'shell-quote';

export interface CommandSpec {
  command: string;
  args?: string | string[];
  envOverrides?: Record<string, string>;
}

export interface ParsedCommand {
  executable: string;
  commandArgs: string[];
  envPatch: Record<string, string>;
  unsupportedFeatures: string[];
}

/**
 * Parse a command specification into sanitized components for safe execution.
 * 
 * Handles:
 * - Quoted arguments: git commit -m "Initial commit"
 * - Environment variables: VAR=value npm run build
 * - Multiple arg formats: args as string or array
 * - Unsupported features: redirects, pipes (gracefully rejected)
 */
export function parseCommandSpec(spec: CommandSpec): ParsedCommand {
  const { command, args, envOverrides = {} } = spec;
  
  const result: ParsedCommand = {
    executable: '',
    commandArgs: [],
    envPatch: { ...envOverrides },
    unsupportedFeatures: []
  };
  
  // Tokenize command string using shell-quote
  const commandTokens = parseShellCommand(command.trim());
  
  let executableFound = false;
  
  // Process command tokens
  for (const token of commandTokens) {
    if (typeof token === 'string') {
      if (!executableFound) {
        // Check if this is a KEY=VALUE environment assignment (uppercase or lowercase)
        const envMatch = token.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (envMatch) {
          // This is an env assignment - add to envPatch
          result.envPatch[envMatch[1]] = envMatch[2];
        } else {
          // This is the executable
          result.executable = token;
          executableFound = true;
        }
      } else {
        // Subsequent string tokens are arguments
        result.commandArgs.push(token);
      }
    } else if (typeof token === 'object' && token !== null) {
      // shell-quote returns objects for special constructs
      // For autonomous execution safety, we reject most of these
      
      if ('op' in token) {
        const op = token.op as string;
        
        // Pipes
        if (op === '|' || op === '||') {
          result.unsupportedFeatures.push(`pipe operator '${op}' - split into separate tasks`);
        }
        // Redirects
        else if (op === '>' || op === '>>' || op === '<' || op === '>&' || op === '2>') {
          result.unsupportedFeatures.push(`redirect operator '${op}' - not supported in autonomous execution`);
        }
        // Command chaining
        else if (op === '&&' || op === ';') {
          result.unsupportedFeatures.push(`chain operator '${op}' - split into separate tasks`);
        }
        // Other operators (globs, env assignments, etc.)
        else {
          result.unsupportedFeatures.push(`shell operator '${op}' - not supported in autonomous execution`);
        }
      }
    }
  }
  
  // Verify we found a valid executable
  if (!executableFound || !result.executable || result.executable.trim() === '') {
    throw new Error(`Invalid command: no executable found in "${command}"`);
  }
  
  // Process additional args parameter
  if (args) {
    const normalizedArgs = normalizeArgs(args);
    result.commandArgs.push(...normalizedArgs);
  }
  
  return result;
}

/**
 * Normalize args (string | string[]) into a clean string[] array.
 * Handles multi-flag strings like "--flag --other" by tokenizing them.
 */
function normalizeArgs(args: string | string[]): string[] {
  if (Array.isArray(args)) {
    // Each array element might still be a multi-flag string
    return args.flatMap(arg => {
      if (typeof arg === 'string' && arg.includes(' ')) {
        // Re-tokenize multi-flag strings
        const tokens = parseShellCommand(arg.trim());
        return tokens.filter((t: unknown) => typeof t === 'string') as string[];
      }
      return [arg];
    });
  } else if (typeof args === 'string') {
    // Tokenize the entire string
    const tokens = parseShellCommand(args.trim());
    return tokens.filter((t: unknown) => typeof t === 'string') as string[];
  }
  
  return [];
}

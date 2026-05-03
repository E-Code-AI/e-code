/**
 * ShellPanel — backward-compatibility shim.
 *
 * All shell functionality has been consolidated into ReplitTerminalPanel,
 * which is the single production component used throughout the IDE.
 * This file re-exports it under the legacy name so existing import sites
 * continue to compile without changes.
 */
export { ReplitTerminalPanel as ShellPanel } from './ReplitTerminalPanel';

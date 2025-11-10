import { CommandPalette as EditorCommandPalette } from '@/components/editor/CommandPalette';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecuteCommand: (commandId: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onExecuteCommand
}: CommandPaletteProps) {
  return (
    <EditorCommandPalette
      open={open}
      onOpenChange={onOpenChange}
      onToolSelect={(tool) => {
        onExecuteCommand(tool);
      }}
    />
  );
}

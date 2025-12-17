/**
 * KeyboardToolbar - Fortune 500-grade keyboard toolbar for React Native code editor
 * Features:
 * - Code shortcuts row (Tab, {}, [], (), ;, =>, //, console.log, function)
 * - Cursor navigation (Left/Right arrows, select all, undo/redo)
 * - Hardware keyboard support (Cmd+S, Cmd+Z, Cmd+Shift+Z)
 * - Auto-indent on Enter
 * - Smart bracket matching
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  InputAccessoryView,
  Keyboard,
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius, mobileShadows } from '../../../shared/theme/mobile-theme';

const MIN_TOUCH_TARGET = 44;

interface ToolbarButton {
  id: string;
  label: string;
  icon?: string;
  value?: string;
  action?: 'insert' | 'cursor' | 'command';
  testId?: string;
}

interface Selection {
  start: number;
  end: number;
}

interface UndoState {
  text: string;
  selection: Selection;
}

interface UseKeyboardToolbarOptions {
  onSave?: () => void;
  maxUndoStack?: number;
}

interface UseKeyboardToolbarReturn {
  inputAccessoryViewID: string;
  handleKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  handleSelectionChange: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
  processTextChange: (text: string, previousText: string) => string;
  insertText: (textToInsert: string) => void;
  moveCursor: (direction: 'left' | 'right') => void;
  selectAll: () => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  selection: Selection;
  setSelection: (selection: Selection) => void;
  textInputRef: React.RefObject<TextInput>;
  KeyboardToolbarComponent: React.FC<KeyboardToolbarProps>;
}

interface KeyboardToolbarProps {
  value: string;
  onChange: (text: string) => void;
  onSave?: () => void;
  inputAccessoryViewID?: string;
}

const BRACKET_PAIRS: Record<string, string> = {
  '{': '}',
  '[': ']',
  '(': ')',
  '"': '"',
  "'": "'",
  '`': '`',
};

const CLOSING_BRACKETS = new Set(['}', ']', ')', '"', "'", '`']);

const CODE_SHORTCUTS: ToolbarButton[] = [
  { id: 'tab', label: 'Tab', value: '\t', action: 'insert', testId: 'toolbar-tab' },
  { id: 'braces', label: '{}', value: '{}', action: 'insert', testId: 'toolbar-braces' },
  { id: 'brackets', label: '[]', value: '[]', action: 'insert', testId: 'toolbar-brackets' },
  { id: 'parens', label: '()', value: '()', action: 'insert', testId: 'toolbar-parens' },
  { id: 'semicolon', label: ';', value: ';', action: 'insert', testId: 'toolbar-semicolon' },
  { id: 'arrow', label: '=>', value: ' => ', action: 'insert', testId: 'toolbar-arrow' },
  { id: 'comment', label: '//', value: '// ', action: 'insert', testId: 'toolbar-comment' },
  { id: 'console', label: 'log', value: 'console.log()', action: 'insert', testId: 'toolbar-console' },
  { id: 'function', label: 'fn', value: 'function () {\n\t\n}', action: 'insert', testId: 'toolbar-function' },
];

const NAVIGATION_BUTTONS: ToolbarButton[] = [
  { id: 'left', label: '←', action: 'cursor', testId: 'toolbar-left' },
  { id: 'right', label: '→', action: 'cursor', testId: 'toolbar-right' },
  { id: 'selectAll', label: 'Sel', action: 'command', testId: 'toolbar-select-all' },
  { id: 'undo', label: '↩', action: 'command', testId: 'toolbar-undo' },
  { id: 'redo', label: '↪', action: 'command', testId: 'toolbar-redo' },
];

export function useKeyboardToolbar(
  value: string,
  onChange: (text: string) => void,
  options: UseKeyboardToolbarOptions = {}
): UseKeyboardToolbarReturn {
  const { onSave, maxUndoStack = 50 } = options;
  
  const textInputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoState[]>([]);
  const inputAccessoryViewID = 'keyboard-toolbar-accessory';

  const pushToUndoStack = useCallback((text: string, sel: Selection) => {
    setUndoStack(prev => {
      const newStack = [...prev, { text, selection: sel }];
      if (newStack.length > maxUndoStack) {
        return newStack.slice(-maxUndoStack);
      }
      return newStack;
    });
    setRedoStack([]);
  }, [maxUndoStack]);

  const insertText = useCallback((textToInsert: string) => {
    pushToUndoStack(value, selection);
    
    const before = value.slice(0, selection.start);
    const after = value.slice(selection.end);
    const newText = before + textToInsert + after;
    
    let cursorOffset = textToInsert.length;
    if (textToInsert === '{}' || textToInsert === '[]' || textToInsert === '()') {
      cursorOffset = 1;
    } else if (textToInsert === 'console.log()') {
      cursorOffset = textToInsert.length - 1;
    } else if (textToInsert.includes('function')) {
      cursorOffset = textToInsert.indexOf('(') + 1;
    }
    
    const newCursorPos = selection.start + cursorOffset;
    
    onChange(newText);
    setSelection({ start: newCursorPos, end: newCursorPos });
  }, [value, selection, onChange, pushToUndoStack]);

  const moveCursor = useCallback((direction: 'left' | 'right') => {
    const newPos = direction === 'left'
      ? Math.max(0, selection.start - 1)
      : Math.min(value.length, selection.end + 1);
    setSelection({ start: newPos, end: newPos });
  }, [selection, value.length]);

  const selectAll = useCallback(() => {
    setSelection({ start: 0, end: value.length });
    textInputRef.current?.focus();
  }, [value.length]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const lastState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, { text: value, selection }]);
    setUndoStack(prev => prev.slice(0, -1));
    onChange(lastState.text);
    setSelection(lastState.selection);
  }, [undoStack, value, selection, onChange]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const lastState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, { text: value, selection }]);
    setRedoStack(prev => prev.slice(0, -1));
    onChange(lastState.text);
    setSelection(lastState.selection);
  }, [redoStack, value, selection, onChange]);

  const save = useCallback(() => {
    onSave?.();
  }, [onSave]);

  const getIndentLevel = useCallback((line: string): number => {
    let indent = 0;
    for (const char of line) {
      if (char === '\t') indent++;
      else if (char === ' ') indent += 0.25;
      else break;
    }
    return Math.floor(indent);
  }, []);

  const processTextChange = useCallback((newText: string, previousText: string): string => {
    if (newText.length === previousText.length + 1) {
      const insertedChar = newText[selection.start];
      const charAfter = newText[selection.start + 1];
      
      if (BRACKET_PAIRS[insertedChar] && !CLOSING_BRACKETS.has(charAfter)) {
        const closingBracket = BRACKET_PAIRS[insertedChar];
        const before = newText.slice(0, selection.start + 1);
        const after = newText.slice(selection.start + 1);
        return before + closingBracket + after;
      }
      
      if (insertedChar === '\n') {
        const lines = newText.slice(0, selection.start + 1).split('\n');
        const currentLine = lines[lines.length - 2] || '';
        const indentLevel = getIndentLevel(currentLine);
        
        const trimmedLine = currentLine.trim();
        const needsExtraIndent = trimmedLine.endsWith('{') || 
                                  trimmedLine.endsWith('[') || 
                                  trimmedLine.endsWith('(') ||
                                  trimmedLine.endsWith(':');
        
        const indent = '\t'.repeat(indentLevel + (needsExtraIndent ? 1 : 0));
        const before = newText.slice(0, selection.start + 1);
        const after = newText.slice(selection.start + 1);
        
        return before + indent + after;
      }
    }
    
    return newText;
  }, [selection.start, getIndentLevel]);

  const handleKeyPress = useCallback((e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const { key } = e.nativeEvent;
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const modifierKey = Platform.OS === 'ios' ? 'cmd' : 'ctrl';
      
      // @ts-ignore - checking for modifier keys
      const isModifierPressed = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;
      // @ts-ignore
      const isShiftPressed = e.nativeEvent.shiftKey;
      
      if (isModifierPressed) {
        if (key === 's' || key === 'S') {
          e.preventDefault?.();
          save();
          return;
        }
        if (key === 'z' || key === 'Z') {
          e.preventDefault?.();
          if (isShiftPressed) {
            redo();
          } else {
            undo();
          }
          return;
        }
        if (key === 'a' || key === 'A') {
          e.preventDefault?.();
          selectAll();
          return;
        }
      }
    }
  }, [save, undo, redo, selectAll]);

  const handleSelectionChange = useCallback((e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const { selection: newSelection } = e.nativeEvent;
    setSelection(newSelection);
  }, []);

  const KeyboardToolbarComponent: React.FC<KeyboardToolbarProps> = useCallback(({ value, onChange, onSave: propOnSave }) => {
    return (
      <KeyboardToolbar
        value={value}
        onChange={onChange}
        onSave={propOnSave || onSave}
        inputAccessoryViewID={inputAccessoryViewID}
        selection={selection}
        setSelection={setSelection}
        insertText={insertText}
        moveCursor={moveCursor}
        selectAll={selectAll}
        undo={undo}
        redo={redo}
        save={save}
        undoDisabled={undoStack.length === 0}
        redoDisabled={redoStack.length === 0}
      />
    );
  }, [inputAccessoryViewID, selection, insertText, moveCursor, selectAll, undo, redo, save, undoStack.length, redoStack.length, onSave]);

  return {
    inputAccessoryViewID,
    handleKeyPress,
    handleSelectionChange,
    processTextChange,
    insertText,
    moveCursor,
    selectAll,
    undo,
    redo,
    save,
    selection,
    setSelection,
    textInputRef,
    KeyboardToolbarComponent,
  };
}

interface InternalKeyboardToolbarProps extends KeyboardToolbarProps {
  selection: Selection;
  setSelection: (selection: Selection) => void;
  insertText: (text: string) => void;
  moveCursor: (direction: 'left' | 'right') => void;
  selectAll: () => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  undoDisabled: boolean;
  redoDisabled: boolean;
}

const KeyboardToolbar: React.FC<InternalKeyboardToolbarProps> = ({
  insertText,
  moveCursor,
  selectAll,
  undo,
  redo,
  save,
  undoDisabled,
  redoDisabled,
  inputAccessoryViewID,
}) => {
  const handleButtonPress = useCallback((button: ToolbarButton) => {
    switch (button.action) {
      case 'insert':
        if (button.value) insertText(button.value);
        break;
      case 'cursor':
        if (button.id === 'left') moveCursor('left');
        else if (button.id === 'right') moveCursor('right');
        break;
      case 'command':
        if (button.id === 'selectAll') selectAll();
        else if (button.id === 'undo') undo();
        else if (button.id === 'redo') redo();
        break;
    }
  }, [insertText, moveCursor, selectAll, undo, redo]);

  const renderButton = (button: ToolbarButton, isDisabled = false) => (
    <TouchableOpacity
      key={button.id}
      style={[
        styles.toolbarButton,
        isDisabled && styles.toolbarButtonDisabled,
      ]}
      onPress={() => handleButtonPress(button)}
      disabled={isDisabled}
      activeOpacity={0.7}
      testID={button.testId}
      accessibilityLabel={button.label}
      accessibilityRole="button"
    >
      <Text style={[
        styles.toolbarButtonText,
        isDisabled && styles.toolbarButtonTextDisabled,
      ]}>
        {button.label}
      </Text>
    </TouchableOpacity>
  );

  const toolbarContent = (
    <View style={styles.toolbarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shortcutsRow}
        keyboardShouldPersistTaps="always"
      >
        {CODE_SHORTCUTS.map(button => renderButton(button))}
      </ScrollView>
      
      <View style={styles.divider} />
      
      <View style={styles.navigationRow}>
        {NAVIGATION_BUTTONS.map(button => {
          const isDisabled = 
            (button.id === 'undo' && undoDisabled) ||
            (button.id === 'redo' && redoDisabled);
          return renderButton(button, isDisabled);
        })}
        
        <TouchableOpacity
          style={[styles.toolbarButton, styles.saveButton]}
          onPress={save}
          activeOpacity={0.7}
          testID="toolbar-save"
          accessibilityLabel="Save"
          accessibilityRole="button"
        >
          <Text style={[styles.toolbarButtonText, styles.saveButtonText]}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <InputAccessoryView nativeID={inputAccessoryViewID}>
        {toolbarContent}
      </InputAccessoryView>
    );
  }

  return toolbarContent;
};

export const KeyboardToolbarStandalone: React.FC<KeyboardToolbarProps> = ({
  value,
  onChange,
  onSave,
  inputAccessoryViewID = 'keyboard-toolbar-accessory',
}) => {
  const {
    insertText,
    moveCursor,
    selectAll,
    undo,
    redo,
    save,
    selection,
    setSelection,
  } = useKeyboardToolbar(value, onChange, { onSave });

  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoState[]>([]);

  return (
    <KeyboardToolbar
      value={value}
      onChange={onChange}
      onSave={onSave}
      inputAccessoryViewID={inputAccessoryViewID}
      selection={selection}
      setSelection={setSelection}
      insertText={insertText}
      moveCursor={moveCursor}
      selectAll={selectAll}
      undo={undo}
      redo={redo}
      save={save}
      undoDisabled={undoStack.length === 0}
      redoDisabled={redoStack.length === 0}
    />
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    backgroundColor: mobileColors.surface,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border,
    paddingVertical: mobileSpacing.xs,
    ...mobileShadows.sm,
  },
  shortcutsRow: {
    flexDirection: 'row',
    paddingHorizontal: mobileSpacing.sm,
    paddingVertical: mobileSpacing.xs,
    gap: mobileSpacing.xs,
  },
  navigationRow: {
    flexDirection: 'row',
    paddingHorizontal: mobileSpacing.sm,
    paddingVertical: mobileSpacing.xs,
    gap: mobileSpacing.xs,
    justifyContent: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: mobileColors.border,
    marginHorizontal: mobileSpacing.md,
    marginVertical: mobileSpacing.xs,
  },
  toolbarButton: {
    backgroundColor: mobileColors.surfaceSecondary,
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderRadius: mobileBorderRadius.md,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: mobileColors.border,
  },
  toolbarButtonDisabled: {
    opacity: 0.4,
  },
  toolbarButtonText: {
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.sm,
    fontFamily: mobileTypography.fontFamily.mono,
    fontWeight: mobileTypography.fontWeight.medium,
  },
  toolbarButtonTextDisabled: {
    color: mobileColors.textMuted,
  },
  saveButton: {
    backgroundColor: mobileColors.primary,
    borderColor: mobileColors.primary,
    marginLeft: 'auto',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: mobileTypography.fontWeight.semibold,
  },
});

export default KeyboardToolbar;

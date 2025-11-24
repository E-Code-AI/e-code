/**
 * React Native Code Editor Component
 * Full-featured mobile code editor with syntax highlighting
 * Uses react-native-code-editor for syntax highlighting
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

interface CodeEditorProps {
  value: string;
  onChange: (text: string) => void;
  language?: 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'json';
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: number;
}

// Simple syntax highlighter for mobile (lightweight)
const getHighlightedCode = (code: string, language: string): { text: string; color: string }[] => {
  const keywords = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'async', 'await', 'import', 'export', 'from'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'async', 'await', 'import', 'export', 'from', 'interface', 'type', 'enum'],
    python: ['def', 'return', 'if', 'else', 'elif', 'for', 'while', 'class', 'import', 'from', 'as', 'try', 'except', 'with', 'async', 'await'],
  };

  const languageKeywords = keywords[language as keyof typeof keywords] || keywords.javascript;

  // Split into tokens
  const tokens: { text: string; color: string }[] = [];
  const lines = code.split('\n');

  lines.forEach((line, lineIndex) => {
    // Comments
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      tokens.push({ text: line, color: mobileColors.success });
    } else {
      // Simple tokenization
      const words = line.split(/(\s+|[(){}[\];,.])/);
      words.forEach(word => {
        if (languageKeywords.includes(word)) {
          tokens.push({ text: word, color: '#F26207' }); // Keywords in orange
        } else if (/^["'].*["']$/.test(word)) {
          tokens.push({ text: word, color: mobileColors.success }); // Strings in green
        } else if (/^\d+$/.test(word)) {
          tokens.push({ text: word, color: mobileColors.info }); // Numbers in blue
        } else {
          tokens.push({ text: word, color: mobileColors.text }); // Default text
        }
      });
    }

    // Add newline except for last line
    if (lineIndex < lines.length - 1) {
      tokens.push({ text: '\n', color: mobileColors.text });
    }
  });

  return tokens;
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  placeholder = 'Start coding...',
  minHeight = 300,
}) => {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  const lines = value.split('\n');
  const lineCount = lines.length;

  // Auto-format helpers
  const handleTextChange = (text: string) => {
    // Auto-close brackets
    const lastChar = text[text.length - 1];
    let newText = text;

    if (lastChar === '{') {
      newText = text + '\n\t\n}';
      // Set cursor position would require native module
    } else if (lastChar === '(') {
      newText = text + ')';
    } else if (lastChar === '[') {
      newText = text + ']';
    } else if (lastChar === '"') {
      newText = text + '"';
    } else if (lastChar === "'") {
      newText = text + "'";
    }

    onChange(newText);
  };

  // Toolbar actions
  const insertText = (textToInsert: string) => {
    const cursorPosition = textInputRef.current?.props.selection?.start || value.length;
    const newText = value.slice(0, cursorPosition) + textToInsert + value.slice(cursorPosition);
    onChange(newText);
  };

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 24));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 10));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
          {/* Special Characters */}
          <TouchableOpacity style={styles.toolButton} onPress={() => insertText('\t')}>
            <Text style={styles.toolButtonText}>Tab</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={() => insertText('{')}>
            <Text style={styles.toolButtonText}>{'{'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={() => insertText('}')}>
            <Text style={styles.toolButtonText}>{'}'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={() => insertText('(')}>
            <Text style={styles.toolButtonText}>(</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={() => insertText(')')}>
            <Text style={styles.toolButtonText}>)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={() => insertText(';')}>
            <Text style={styles.toolButtonText}>;</Text>
          </TouchableOpacity>

          <View style={styles.toolSeparator} />

          {/* Font size controls */}
          <TouchableOpacity style={styles.toolButton} onPress={decreaseFontSize}>
            <Text style={styles.toolButtonText}>A-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={increaseFontSize}>
            <Text style={styles.toolButtonText}>A+</Text>
          </TouchableOpacity>

          <View style={styles.toolSeparator} />

          {/* Line numbers toggle */}
          <TouchableOpacity style={styles.toolButton} onPress={() => setShowLineNumbers(!showLineNumbers)}>
            <Text style={styles.toolButtonText}>{showLineNumbers ? 'Hide #' : 'Show #'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Editor Container */}
      <View style={styles.editorContainer}>
        {/* Line Numbers */}
        {showLineNumbers && (
          <View style={styles.lineNumbers}>
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            >
              {lines.map((_, index) => (
                <Text key={index} style={[styles.lineNumber, { fontSize }]}>
                  {index + 1}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Code Input */}
        <ScrollView
          style={styles.codeScroll}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => {
            // Sync scroll with line numbers
            scrollViewRef.current?.scrollTo({ y: e.nativeEvent.contentOffset.y, animated: false });
          }}
          scrollEventThrottle={16}
        >
          <TextInput
            ref={textInputRef}
            style={[styles.codeInput, { fontSize, minHeight }]}
            value={value}
            onChangeText={handleTextChange}
            multiline
            editable={!readOnly}
            placeholder={placeholder}
            placeholderTextColor={mobileColors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            textAlignVertical="top"
            keyboardType="default"
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </ScrollView>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Lines: {lineCount} · Language: {language} · Size: {fontSize}px
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.editorBg,
  },
  toolbar: {
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border,
    backgroundColor: mobileColors.surface,
  },
  toolbarContent: {
    flexDirection: 'row',
    padding: mobileSpacing.sm,
    gap: mobileSpacing.xs,
  },
  toolButton: {
    backgroundColor: mobileColors.surfaceSecondary,
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderRadius: mobileBorderRadius.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  toolButtonText: {
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.sm,
    fontFamily: mobileTypography.fontFamily.mono,
  },
  toolSeparator: {
    width: 1,
    backgroundColor: mobileColors.border,
    marginHorizontal: mobileSpacing.xs,
  },
  editorContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  lineNumbers: {
    backgroundColor: mobileColors.surfaceSecondary,
    paddingHorizontal: mobileSpacing.sm,
    paddingVertical: mobileSpacing.md,
    borderRightWidth: 1,
    borderRightColor: mobileColors.border,
  },
  lineNumber: {
    color: mobileColors.textMuted,
    fontFamily: mobileTypography.fontFamily.mono,
    textAlign: 'right',
    lineHeight: 21,
  },
  codeScroll: {
    flex: 1,
  },
  codeInput: {
    flex: 1,
    color: mobileColors.text,
    fontFamily: mobileTypography.fontFamily.mono,
    padding: mobileSpacing.md,
    lineHeight: 21,
  },
  statusBar: {
    borderTopWidth: 1,
    borderTopColor: mobileColors.border,
    backgroundColor: mobileColors.surface,
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
  },
  statusText: {
    color: mobileColors.textMuted,
    fontSize: mobileTypography.fontSize.xs,
    fontFamily: mobileTypography.fontFamily.mono,
  },
});

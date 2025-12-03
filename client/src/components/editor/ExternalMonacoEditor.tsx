/**
 * ExternalMonacoEditor - A CodeMirror 6 editor component.
 * 
 * Note: This component was originally designed for Monaco loaded from CDN.
 * It has been migrated to use CodeMirror 6 (CM6Editor) for better performance
 * and bundle size. The API is maintained for backwards compatibility.
 */

import { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { CM6Editor } from './CM6Editor';
import { cn } from '@/lib/utils';

export interface ExternalMonacoEditorProps {
  value?: string;
  defaultValue?: string;
  language?: string;
  theme?: string;
  height?: string | number;
  width?: string | number;
  options?: {
    readOnly?: boolean;
    tabSize?: number;
    wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
    lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
    [key: string]: any;
  };
  onChange?: (value: string | undefined) => void;
  onMount?: (view: EditorView) => void;
  beforeMount?: () => void;
  className?: string;
  loading?: React.ReactNode;
  line?: number;
  saveViewState?: boolean;
  keepCurrentModel?: boolean;
  path?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export interface ExternalMonacoEditorHandle {
  getEditor: () => EditorView | null;
  getMonaco: () => null;
  getValue: () => string | undefined;
  setValue: (value: string) => void;
  focus: () => void;
}

export const ExternalMonacoEditor = forwardRef<ExternalMonacoEditorHandle, ExternalMonacoEditorProps>(
  function ExternalMonacoEditor(props, ref) {
    const {
      value,
      defaultValue,
      language = 'javascript',
      theme = 'vs-dark',
      height = '100%',
      width = '100%',
      options = {},
      onChange,
      onMount,
      beforeMount,
      className,
      placeholder,
      readOnly,
    } = props;

    const viewRef = useRef<EditorView | null>(null);
    const valueRef = useRef(value ?? defaultValue ?? '');

    useImperativeHandle(ref, () => ({
      getEditor: () => viewRef.current,
      getMonaco: () => null,
      getValue: () => {
        if (viewRef.current) {
          return viewRef.current.state.doc.toString();
        }
        return valueRef.current;
      },
      setValue: (newValue: string) => {
        if (viewRef.current) {
          const currentValue = viewRef.current.state.doc.toString();
          viewRef.current.dispatch({
            changes: {
              from: 0,
              to: currentValue.length,
              insert: newValue,
            },
          });
        }
        valueRef.current = newValue;
      },
      focus: () => viewRef.current?.focus(),
    }));

    const handleMount = useCallback((view: EditorView) => {
      viewRef.current = view;
      onMount?.(view);
    }, [onMount]);

    const handleChange = useCallback((newValue: string) => {
      valueRef.current = newValue;
      onChange?.(newValue);
    }, [onChange]);

    const cm6Theme = theme === 'vs-dark' || theme === 'dark' || theme.includes('dark') 
      ? 'dark' 
      : 'light';

    const isReadOnly = readOnly ?? options.readOnly ?? false;
    const tabSize = options.tabSize ?? 2;
    const lineWrapping = options.wordWrap === 'on' || options.wordWrap === 'bounded';

    if (beforeMount) {
      beforeMount();
    }

    return (
      <div
        className={cn('overflow-hidden', className)}
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: typeof width === 'number' ? `${width}px` : width,
        }}
      >
        <CM6Editor
          value={valueRef.current}
          language={language}
          onChange={handleChange}
          onMount={handleMount}
          readOnly={isReadOnly}
          height="100%"
          theme={cm6Theme}
          tabSize={tabSize}
          lineWrapping={lineWrapping}
          placeholder={placeholder}
        />
      </div>
    );
  }
);

export default ExternalMonacoEditor;

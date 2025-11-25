import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

export type FileNode = {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  expanded?: boolean;
};

type FileExplorerProps = {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  onFilePress?: (file: FileNode) => void;
  selectedFileId?: string;
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  onFilePress,
  selectedFileId
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const toggleDirectory = useCallback((dirId: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dirId)) {
        next.delete(dirId);
      } else {
        next.add(dirId);
      }
      return next;
    });
  }, []);

  const getFileIcon = (file: FileNode) => {
    if (file.type === 'directory') {
      return expandedDirs.has(file.id) ? '📂' : '📁';
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return '📜';
      case 'ts':
      case 'tsx':
        return '🔷';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      case 'css':
      case 'scss':
        return '🎨';
      case 'html':
        return '🌐';
      case 'py':
        return '🐍';
      default:
        return '📄';
    }
  };

  const renderFile = useCallback(
    (file: FileNode, depth: number = 0) => {
      const isExpanded = expandedDirs.has(file.id);
      const isSelected = file.id === selectedFileId;

      return (
        <View key={file.id}>
          <TouchableOpacity
            style={[
              styles.fileItem,
              { paddingLeft: mobileSpacing.md + depth * 20 },
              isSelected && styles.fileItemSelected
            ]}
            onPress={() => {
              if (file.type === 'directory') {
                toggleDirectory(file.id);
              } else {
                onFileSelect(file);
                onFilePress?.(file);
              }
            }}
          >
            <Text style={styles.fileIcon}>{getFileIcon(file)}</Text>
            <Text
              style={[styles.fileName, isSelected && styles.fileNameSelected]}
              numberOfLines={1}
            >
              {file.name}
            </Text>
            {file.type === 'directory' && (
              <Text style={styles.dirArrow}>{isExpanded ? '▼' : '▶'}</Text>
            )}
          </TouchableOpacity>

          {file.type === 'directory' &&
            isExpanded &&
            file.children?.map(child => renderFile(child, depth + 1))}
        </View>
      );
    },
    [expandedDirs, selectedFileId, onFileSelect, onFilePress, toggleDirectory]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Files</Text>
      </View>
      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderFile(item, 0)}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background.primary
  },
  header: {
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border.default,
    backgroundColor: mobileColors.background.secondary
  },
  headerText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '700',
    color: mobileColors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  list: {
    paddingVertical: mobileSpacing.xs
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: mobileSpacing.sm,
    paddingRight: mobileSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border.subtle
  },
  fileItemSelected: {
    backgroundColor: mobileColors.primary.default + '20',
    borderLeftWidth: 3,
    borderLeftColor: mobileColors.primary.default
  },
  fileIcon: {
    fontSize: 18,
    marginRight: mobileSpacing.sm,
    width: 24
  },
  fileName: {
    flex: 1,
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.text.primary,
    fontFamily: 'monospace'
  },
  fileNameSelected: {
    color: mobileColors.primary.default,
    fontWeight: '600'
  },
  dirArrow: {
    fontSize: 12,
    color: mobileColors.text.tertiary,
    marginLeft: mobileSpacing.xs
  }
});

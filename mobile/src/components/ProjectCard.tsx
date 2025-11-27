import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Project } from '../types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type ProjectCardProps = {
  project: Project;
  onPress: () => void;
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onPress }) => {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'recently';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'recently';

    const now = Date.now();
    const diff = now - d.getTime();

    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}d ago`;
    } else {
      return d.toLocaleDateString();
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {project.name}
        </Text>
        {project.language && (
          <View style={styles.languageBadge}>
            <Text style={styles.languageText}>
              {project.language.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {project.description && (
        <Text style={styles.description} numberOfLines={2}>
          {project.description}
        </Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.meta}>
          Updated {formatDate(project.updatedAt)}
        </Text>
        {project.stats && (
          <Text style={styles.meta}>
            {project.stats.views || 0} views · {project.stats.forks || 0} forks
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.sm,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: mobileSpacing.xs
  },
  name: {
    flex: 1,
    fontSize: mobileTypography.fontSize.lg,
    fontWeight: '600',
    color: mobileColors.text
  },
  languageBadge: {
    backgroundColor: mobileColors.primary + '30',
    paddingHorizontal: mobileSpacing.sm,
    paddingVertical: 4,
    borderRadius: mobileBorderRadius.full,
    marginLeft: mobileSpacing.sm
  },
  languageText: {
    fontSize: mobileTypography.fontSize.xs,
    fontWeight: '600',
    color: mobileColors.primary
  },
  description: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary,
    lineHeight: 18,
    marginBottom: mobileSpacing.sm
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  meta: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted
  }
});

import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { User } from '../types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'> & {
  user: User;
  token: string;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, user, token }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [website, setWebsite] = useState(user.website || '');

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // TODO: API call to update profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }, [displayName, bio, location, website]);

  const handleCancel = useCallback(() => {
    setDisplayName(user.displayName || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setWebsite(user.website || '');
    setEditing(false);
  }, [user]);

  const handleChangeAvatar = useCallback(() => {
    Alert.alert('Coming Soon', 'Change avatar feature coming soon');
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.avatarUrl || user.profileImageUrl ? (
            <Image
              source={{ uri: user.avatarUrl || user.profileImageUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(displayName || user.username).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {editing && (
            <TouchableOpacity
              style={styles.avatarEditButton}
              onPress={handleChangeAvatar}
            >
              <Text style={styles.avatarEditText}>✎</Text>
            </TouchableOpacity>
          )}
        </View>

        {!editing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(true)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={[styles.fieldInput, styles.fieldInputDisabled]}>
            <Text style={styles.fieldValue}>@{user.username}</Text>
          </View>
          <Text style={styles.fieldHint}>Username cannot be changed</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Display Name</Text>
          {editing ? (
            <TextInput
              style={styles.fieldInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your display name"
              placeholderTextColor={mobileColors.textMuted}
              autoCapitalize="words"
            />
          ) : (
            <View style={[styles.fieldInput, styles.fieldInputDisabled]}>
              <Text style={styles.fieldValue}>{displayName || 'Not set'}</Text>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={[styles.fieldInput, styles.fieldInputDisabled]}>
            <Text style={styles.fieldValue}>{user.email || 'Not set'}</Text>
          </View>
          <Text style={styles.fieldHint}>Email is managed in settings</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bio</Text>
          {editing ? (
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor={mobileColors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ) : (
            <View style={[styles.fieldInput, styles.fieldInputDisabled, styles.fieldInputMultiline]}>
              <Text style={styles.fieldValue}>{bio || 'No bio yet'}</Text>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Location</Text>
          {editing ? (
            <TextInput
              style={styles.fieldInput}
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
              placeholderTextColor={mobileColors.textMuted}
            />
          ) : (
            <View style={[styles.fieldInput, styles.fieldInputDisabled]}>
              <Text style={styles.fieldValue}>{location || 'Not set'}</Text>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Website</Text>
          {editing ? (
            <TextInput
              style={styles.fieldInput}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://example.com"
              placeholderTextColor={mobileColors.textMuted}
              keyboardType="url"
              autoCapitalize="none"
            />
          ) : (
            <View style={[styles.fieldInput, styles.fieldInputDisabled]}>
              <Text style={styles.fieldValue}>{website || 'Not set'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user.projectCount || 0}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user.followersCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {editing && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.buttonTextSecondary}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonTextPrimary}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background
  },
  content: {
    padding: mobileSpacing.md,
    paddingBottom: mobileSpacing.xl
  },
  header: {
    alignItems: 'center',
    marginBottom: mobileSpacing.xl
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: mobileSpacing.md
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: mobileColors.surfaceSecondary,
    borderWidth: 3,
    borderColor: mobileColors.border
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: mobileColors.primary,
    borderWidth: 3,
    borderColor: mobileColors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff'
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: mobileColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: mobileColors.background
  },
  avatarEditText: {
    fontSize: 16,
    color: '#fff'
  },
  editButton: {
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: mobileSpacing.sm,
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.full,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  editButtonText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.text
  },
  section: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    borderWidth: 1,
    borderColor: mobileColors.border,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.lg
  },
  field: {
    marginBottom: mobileSpacing.lg
  },
  fieldLabel: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.textSecondary,
    marginBottom: mobileSpacing.xs
  },
  fieldInput: {
    backgroundColor: mobileColors.background,
    borderWidth: 1,
    borderColor: mobileColors.border,
    borderRadius: mobileBorderRadius.md,
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text
  },
  fieldInputDisabled: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderColor: mobileColors.border
  },
  fieldInputMultiline: {
    height: 100,
    paddingTop: mobileSpacing.sm
  },
  fieldValue: {
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text
  },
  fieldHint: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted,
    marginTop: mobileSpacing.xs
  },
  statsSection: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    borderWidth: 1,
    borderColor: mobileColors.border,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.lg
  },
  sectionTitle: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '700',
    color: mobileColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: mobileSpacing.md
  },
  statsGrid: {
    flexDirection: 'row',
    gap: mobileSpacing.sm
  },
  statCard: {
    flex: 1,
    backgroundColor: mobileColors.background,
    borderRadius: mobileBorderRadius.md,
    borderWidth: 1,
    borderColor: mobileColors.border,
    padding: mobileSpacing.md,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: mobileColors.primary,
    marginBottom: 4
  },
  statLabel: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary
  },
  actions: {
    flexDirection: 'row',
    gap: mobileSpacing.sm
  },
  button: {
    flex: 1,
    paddingVertical: mobileSpacing.md,
    borderRadius: mobileBorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  buttonPrimary: {
    backgroundColor: mobileColors.primary
  },
  buttonSecondary: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  buttonTextPrimary: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: '#fff'
  },
  buttonTextSecondary: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text
  }
});

export default ProfileScreen;

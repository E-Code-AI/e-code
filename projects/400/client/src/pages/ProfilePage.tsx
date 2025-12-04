import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
  TextField,
  Typography,
  Alert,
  Paper,
  Stack,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

type UserRole = "user" | "admin" | "manager";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileUpdatePayload {
  firstName: string;
  lastName: string;
  displayName: string;
  bio?: string | null;
  location?: string | null;
  phone?: string | null;
}

interface PasswordUpdatePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type SnackbarSeverity = "success" | "error" | "info" | "warning";

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

const AvatarWrapper = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "inline-block",
  marginBottom: theme.spacing(2),
}));

const AvatarEditButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  bottom: 0,
  right: 0,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  "&:hover": {
    backgroundColor: theme.palette.background.default,
  },
}));

const HiddenFileInput = styled("input")({
  display: "none",
});

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [formValues, setFormValues] = useState<ProfileUpdatePayload>({
    firstName: "",
    lastName: "",
    displayName: "",
    bio: "",
    location: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProfileUpdatePayload, string>>>(
    {}
  );
  const [passwordValues, setPasswordValues] = useState<PasswordUpdatePayload>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<Record<keyof PasswordUpdatePayload, string>>
  >({});
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "info",
  });
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/me", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }
      const data: UserProfile = await response.json();
      setProfile(data);
      setFormValues({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        displayName: data.displayName || "",
        bio: data.bio || "",
        location: data.location || "",
        phone: data.phone || "",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Unable to load profile. Please try again later.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleEditToggle = () => {
    if (!editMode && profile) {
      setFormValues({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        location: profile.location || "",
        phone: profile.phone || "",
      });
      setFormErrors({});
    }
    setEditMode((prev) => !prev);
  };

  const handleFormChange = (
    field: keyof ProfileUpdatePayload,
    value: string | null | undefined
  ) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
    setFormErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const validateProfileForm = (): boolean => {
    const errors: Partial<Record<keyof ProfileUpdatePayload, string>> = {};
    if (!formValues.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!formValues.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (!formValues.displayName.trim()) {
      errors.displayName = "Display name is required";
    }
    if (formValues.phone && !/^\+?[0-9\-()\s]{7,20}$/.test(formValues.phone)) {
      errors.phone = "Invalid phone number format";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!validateProfileForm()) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formValues),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      const updated: UserProfile = await response.json();
      setProfile(updated);
      setEditMode(false);
      setSnackbar({
        open: true,
        message: "Profile updated successfully.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Unable to update profile. Please try again.",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSnackbar({
        open: true,
        message: "Please select a valid image file.",
        severity: "warning",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "Image size should be less than 5MB.",
        severity: "warning",
      });
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/me/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload avatar");
      }

      const updated: UserProfile = await response.json();
      setProfile(updated);
      setSnackbar({
        open: true,
        message: "Profile picture updated.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Unable to upload avatar. Please try again.",
        severity: "error",
      });
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handlePasswordChange = (
    field: keyof PasswordUpdatePayload,
    value: string
  ) => {
    setPasswordValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPasswordErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const validatePasswordForm = (): boolean => {
    const errors: Partial<Record<keyof PasswordUpdatePayload, string>> =
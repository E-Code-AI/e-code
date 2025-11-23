/**
 * React Native File Operations Service
 * Complete file management for mobile app
 */

import { ProjectFile } from '../types';
import { getApiUrl } from '../../../shared/config/env';

const API_BASE = getApiUrl();

/**
 * Get all files in a project
 */
export async function getFiles(projectId: string | number, token: string): Promise<ProjectFile[]> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/files`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create a new file
 */
export async function createFile(
  projectId: string | number,
  path: string,
  content: string,
  language: string,
  token: string
): Promise<ProjectFile> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      content,
      language,
      isFolder: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create file: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create a new folder
 */
export async function createFolder(
  projectId: string | number,
  path: string,
  token: string
): Promise<ProjectFile> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      isFolder: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create folder: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Update file content
 */
export async function updateFile(
  projectId: string | number,
  fileId: number,
  content: string,
  token: string
): Promise<ProjectFile> {
  const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update file: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Rename file or folder
 */
export async function renameFile(
  fileId: number,
  newPath: string,
  token: string
): Promise<ProjectFile> {
  const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: newPath }),
  });

  if (!response.ok) {
    throw new Error(`Failed to rename file: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Delete file or folder
 */
export async function deleteFile(fileId: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.statusText}`);
  }
}

/**
 * Move file or folder
 */
export async function moveFile(
  fileId: number,
  newParentId: number | null,
  token: string
): Promise<ProjectFile> {
  const response = await fetch(`${API_BASE}/api/files/${fileId}/move`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ parentId: newParentId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to move file: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Duplicate file or folder
 */
export async function duplicateFile(
  projectId: string | number,
  fileId: number,
  token: string
): Promise<ProjectFile> {
  const response = await fetch(`${API_BASE}/api/files/${fileId}/duplicate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to duplicate file: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Search files by name or content
 */
export async function searchFiles(
  projectId: string | number,
  query: string,
  token: string
): Promise<ProjectFile[]> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/files/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to search files: ${response.statusText}`);
  }

  return await response.json();
}

import React, { useCallback, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

type Channel = {
  id: string;
  name: string;
  unreadCount?: number;
  isMuted?: boolean;
  isPrivate?: boolean;
};

type DirectMessage = {
  id: string;
  name: string;
  isOnline: boolean;
  unreadCount?: number;
};

type UserPresenceStatus = "online" | "away" | "busy" | "offline";

type User = {
  id: string;
  name: string;
  avatarUrl?: string;
  status: UserPresenceStatus;
};

type SidebarSection = "channels" | "directMessages";

interface SidebarProps {
  currentUser: User;
  channels: Channel[];
  directMessages: DirectMessage[];
  onChannelSelect?: (channelId: string) => void;
  onDirectMessageSelect?: (dmId: string) => void;
  onCreateChannel?: () => void;
  onStartDirectMessage?: () => void;
  onStatusChange?: (status: UserPresenceStatus) => void;
  activeChannelId?: string | null;
  activeDirectMessageId?: string | null;
  className?: string;
}

const presenceColorMap: Record<UserPresenceStatus, string> = {
  online: "bg-green-500",
  away: "bg-yellow-400",
  busy: "bg-red-500",
  offline: "bg-gray-400",
};

const presenceLabelMap: Record<UserPresenceStatus, string> = {
  online: "Online",
  away: "Away",
  busy: "Do not disturb",
  offline: "Offline",
};

const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  channels,
  directMessages,
  onChannelSelect,
  onDirectMessageSelect,
  onCreateChannel,
  onStartDirectMessage,
  onStatusChange,
  activeChannelId,
  activeDirectMessageId,
  className = "",
}) => {
  const [expandedSection, setExpandedSection] = useState<SidebarSection | null>("channels");

  const handleSectionToggle = useCallback(
    (section: SidebarSection) => {
      setExpandedSection((prev) => (prev === section ? null : section));
    },
    [setExpandedSection]
  );

  const handleStatusChange = useCallback(
    (status: UserPresenceStatus) => {
      if (onStatusChange) {
        onStatusChange(status);
      }
    },
    [onStatusChange]
  );

  const sortedChannels = useMemo(
    () =>
      [...channels].sort((a, b) => {
        const aUnread = a.unreadCount ?? 0;
        const bUnread = b.unreadCount ?? 0;
        if (aUnread === bUnread) return a.name.localeCompare(b.name);
        return bUnread - aUnread;
      }),
    [channels]
  );

  const sortedDirectMessages = useMemo(
    () =>
      [...directMessages].sort((a, b) => {
        if (a.isOnline === b.isOnline) {
          const aUnread = a.unreadCount ?? 0;
          const bUnread = b.unreadCount ?? 0;
          if (aUnread === bUnread) return a.name.localeCompare(b.name);
          return bUnread - aUnread;
        }
        return a.isOnline ? -1 : 1;
      }),
    [directMessages]
  );

  const renderPresenceDot = (status: UserPresenceStatus) => (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full undefined border border-white`}
      aria-hidden="true"
    />
  );

  const renderUnreadBadge = (count?: number) => {
    if (!count || count <= 0) return null;
    return (
      <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  const isChannelActive = (id: string) => activeChannelId === id;
  const isDirectMessageActive = (id: string) => activeDirectMessageId === id;

  return (
    <aside
      className={`flex h-full w-64 flex-col border-r border-gray-200 bg-white text-gray-900 undefined`}
      aria-label="Sidebar"
    >
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <div className="relative h-9 w-9 flex-shrink-0">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute bottom-0 right-0">
            {renderPresenceDot(currentUser.status)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{currentUser.name}</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{presenceLabelMap[currentUser.status]}</span>
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label="Change status"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 3a1.5 1.5 0 0 1 1.5 1.5v4.879l2.44 2.44a1.5 1.5 0 0 1-2.12 2.122l-2.75-2.75A1.5 1.5 0 0 1 8.5 10V4.5A1.5 1.5 0 0 1 10 3Z" />
              <path
                fillRule="evenodd"
                d="M10 1.5a8.5 8.5 0 1 0 8.5 8.5A8.51 8.51 0 0 0 10 1.5Zm-6 8.5a6 6 0 1 1 11.999.001A6 6 0 0 1 4 10Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 hidden w-40 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg group-focus-within:pointer-events-auto group-focus-within:block">
            {(["online", "away", "busy", "offline"] as UserPresenceStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50"
              >
                {renderPresenceDot(status)}
                <span>{presenceLabelMap[status]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 text-sm" aria-label="Primary">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => handleSectionToggle("channels")}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-50"
            aria-expanded={expandedSection === "channels"}
          >
            <span className="flex items-center gap-1.5">
              <svg
                className={`h-3 w-3 transform transition-transform undefined`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.92 10 7.2 6.29A.75.75 0 1 1 8.26 5.23l4.25 4
import React, { FC, useMemo } from "react";

export type UserStatus = "online" | "offline" | "away" | "busy" | "unknown";

export interface UserAvatarProps {
  /**
   * URL of the user's avatar image.
   */
  src?: string | null;
  /**
   * User's display name, used for alt text and initials.
   */
  name?: string;
  /**
   * Optional explicit initials to display when no image is available.
   */
  initials?: string;
  /**
   * Size of the avatar in pixels.
   */
  size?: number;
  /**
   * User's current status.
   */
  status?: UserStatus;
  /**
   * Additional CSS class names for the root element.
   */
  className?: string;
  /**
   * Accessible label for screen readers. If not provided, it will be derived from the name and status.
   */
  ariaLabel?: string;
  /**
   * Whether the avatar should be focusable.
   */
  tabIndex?: number;
  /**
   * Optional click handler.
   */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /**
   * Optional title attribute for tooltip.
   */
  title?: string;
  /**
   * Whether to show the status indicator.
   */
  showStatus?: boolean;
  /**
   * Optional background color for initials avatar.
   */
  backgroundColor?: string;
  /**
   * Optional text color for initials avatar.
   */
  textColor?: string;
}

const DEFAULT_SIZE = 40;

const getInitialsFromName = (name?: string): string => {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
};

const getStatusColor = (status: UserStatus): string => {
  switch (status) {
    case "online":
      return "#22c55e"; // green-500
    case "away":
      return "#eab308"; // yellow-500
    case "busy":
      return "#ef4444"; // red-500
    case "offline":
      return "#9ca3af"; // gray-400
    case "unknown":
    default:
      return "#d1d5db"; // gray-300
  }
};

const getStatusLabel = (status: UserStatus): string => {
  switch (status) {
    case "online":
      return "Online";
    case "away":
      return "Away";
    case "busy":
      return "Busy";
    case "offline":
      return "Offline";
    case "unknown":
    default:
      return "Status unknown";
  }
};

export const UserAvatar: FC<UserAvatarProps> = ({
  src,
  name,
  initials,
  size = DEFAULT_SIZE,
  status = "unknown",
  className = "",
  ariaLabel,
  tabIndex,
  onClick,
  title,
  showStatus = true,
  backgroundColor,
  textColor,
}) => {
  const computedInitials = useMemo(
    () => initials || getInitialsFromName(name),
    [initials, name]
  );

  const hasImage = Boolean(src);
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  const rootAriaLabel =
    ariaLabel ||
    [name || "User", showStatus ? `(undefined)` : null]
      .filter(Boolean)
      .join(" ");

  const rootTitle =
    title ||
    [name, showStatus ? statusLabel.toLowerCase() : null]
      .filter(Boolean)
      .join(" - ") || undefined;

  const dimension = `undefinedpx`;
  const statusSize = Math.max(6, Math.round(size * 0.3));
  const statusBorderWidth = Math.max(2, Math.round(size * 0.06));

  const baseBackgroundColor = backgroundColor || "#e5e7eb"; // gray-200
  const baseTextColor = textColor || "#374151"; // gray-700

  const rootStyle: React.CSSProperties = {
    position: "relative",
    width: dimension,
    height: dimension,
    borderRadius: "9999px",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: baseBackgroundColor,
    color: baseTextColor,
    fontSize: `undefinedpx`,
    fontWeight: 600,
    userSelect: "none",
    cursor: onClick ? "pointer" : "default",
    flexShrink: 0,
  };

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };

  const statusStyle: React.CSSProperties = {
    position: "absolute",
    right: Math.round(size * 0.02),
    bottom: Math.round(size * 0.02),
    width: `undefinedpx`,
    height: `undefinedpx`,
    borderRadius: "9999px",
    backgroundColor: statusColor,
    border: `undefinedpx solid white`,
    boxSizing: "content-box",
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (event as unknown) as React.MouseEvent<HTMLDivElement>
      );
    }
  };

  return (
    <div
      className={className}
      style={rootStyle}
      aria-label={rootAriaLabel}
      role={onClick ? "button" : "img"}
      tabIndex={typeof tabIndex === "number" ? tabIndex : onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      title={rootTitle}
    >
      {hasImage ? (
        <img
          src={src as string}
          alt={name || "User avatar"}
          style={imageStyle}
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
          }}
        />
      ) : computedInitials ? (
        <span aria-hidden="true">{computedInitials}</span>
      ) : (
        <span aria-hidden="true">
          {(name || "?").charAt(0).toUpperCase()}
        </span>
      )}
      {showStatus && (
        <span
          style={statusStyle}
          aria-hidden="true"
          data-status={status}
        />
      )}
    </div>
  );
};

export default UserAvatar;
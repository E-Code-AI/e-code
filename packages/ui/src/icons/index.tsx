import * as icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export type IconName = keyof typeof icons;

export type IconProps = LucideProps & {
  name: IconName;
  label?: string;
};

export function Icon({ name, label, size = 16, strokeWidth = 2, ...props }: IconProps) {
  const Component = icons[name] as React.ComponentType<LucideProps>;
  return <Component aria-hidden={label ? undefined : true} aria-label={label} size={size} strokeWidth={strokeWidth} {...props} />;
}

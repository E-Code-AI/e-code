import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as MenubarPrimitive from '@radix-ui/react-menubar';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as ToastPrimitive from '@radix-ui/react-toast';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Command as CommandPrimitive } from 'cmdk';
import { Upload } from 'lucide-react';
import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { useDropzone } from 'react-dropzone';
import { Controller, FormProvider, useFormContext, type FieldPath, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { cx } from '../utils.js';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const buttonVariants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-blue-700',
  secondary: 'bg-teal-600 text-white hover:bg-teal-700',
  ghost: 'bg-transparent text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900',
  outline: 'border border-border bg-transparent text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const buttonSizes: Record<Size, string> = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-base',
  xl: 'h-12 px-6 text-base',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconOnly?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, iconOnly = false, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:ecode-focus-ring disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant],
        iconOnly ? 'aspect-square px-0' : buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : null}
      <span className={cx(iconOnly ? 'sr-only' : undefined)}>{children}</span>
    </button>
  ),
);
Button.displayName = 'Button';

export type IconButtonProps = Omit<ButtonProps, 'iconOnly'> & { label: string };
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({ label, children, ...props }, ref) => (
  <Button ref={ref} aria-label={label} title={label} iconOnly {...props}>
    {children}
  </Button>
));
IconButton.displayName = 'IconButton';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cx('h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted focus-visible:ecode-focus-ring disabled:cursor-not-allowed disabled:opacity-50', className)}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cx('min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted focus-visible:ecode-focus-ring disabled:cursor-not-allowed disabled:opacity-50', className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export type SelectItem = { value: string; label: string; disabled?: boolean };
export type SelectProps = { value?: string; defaultValue?: string; placeholder?: string; items: SelectItem[]; onValueChange?: (value: string) => void; className?: string };
export function Select({ value, defaultValue, placeholder = 'Select', items, onValueChange, className }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger className={cx('flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-sm focus-visible:ecode-focus-ring', className)}>
        <SelectPrimitive.Value placeholder={placeholder} />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-50 overflow-hidden rounded-md border border-border bg-elevated shadow-lg">
          <SelectPrimitive.Viewport className="p-1">
            {items.map((item) => (
              <SelectPrimitive.Item key={item.value} value={item.value} disabled={item.disabled} className="cursor-pointer rounded-sm px-3 py-2 text-sm outline-none hover:bg-neutral-100 focus:bg-neutral-100 data-[disabled]:opacity-50 dark:hover:bg-neutral-900 dark:focus:bg-neutral-900">
                <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export type ComboboxProps = { options: SelectItem[]; value?: string; placeholder?: string; onValueChange?: (value: string) => void };
export function Combobox({ options, value, placeholder = 'Search', onValueChange }: ComboboxProps) {
  return (
    <CommandPrimitive className="overflow-hidden rounded-md border border-border bg-background">
      <CommandPrimitive.Input className="h-9 w-full bg-transparent px-3 text-sm outline-none" placeholder={placeholder} />
      <CommandPrimitive.List className="max-h-64 overflow-auto p-1">
        {options.map((option) => (
          <CommandPrimitive.Item
            key={option.value}
            value={option.value}
            onSelect={onValueChange}
            className={cx('cursor-pointer rounded-sm px-3 py-2 text-sm aria-selected:bg-neutral-100 dark:aria-selected:bg-neutral-900', value === option.value && 'bg-neutral-100 dark:bg-neutral-900')}
          >
            {option.label}
          </CommandPrimitive.Item>
        ))}
      </CommandPrimitive.List>
    </CommandPrimitive>
  );
}

export const Checkbox = CheckboxPrimitive.Root;
export const CheckboxIndicator = CheckboxPrimitive.Indicator;
export const RadioGroup = RadioGroupPrimitive.Root;
export const RadioGroupItem = RadioGroupPrimitive.Item;
export const Switch = SwitchPrimitive.Root;
export const Slider = SliderPrimitive.Root;
export const SliderTrack = SliderPrimitive.Track;
export const SliderRange = SliderPrimitive.Range;
export const SliderThumb = SliderPrimitive.Thumb;
export const Tabs = TabsPrimitive.Root;
export const TabsList = TabsPrimitive.List;
export const TabsTrigger = TabsPrimitive.Trigger;
export const TabsContent = TabsPrimitive.Content;
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogContent = DialogPrimitive.Content;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetContent = DialogPrimitive.Content;
export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerContent = DialogPrimitive.Content;
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverContent = PopoverPrimitive.Content;
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = TooltipPrimitive.Content;
export const ToastProvider = ToastPrimitive.Provider;
export const Toast = ToastPrimitive.Root;
export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastViewport = ToastPrimitive.Viewport;
export const Dropdown = DropdownMenuPrimitive.Root;
export const DropdownTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownContent = DropdownMenuPrimitive.Content;
export const DropdownItem = DropdownMenuPrimitive.Item;
export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuContent = ContextMenuPrimitive.Content;
export const ContextMenuItem = ContextMenuPrimitive.Item;
export const Menubar = MenubarPrimitive.Root;
export const MenubarMenu = MenubarPrimitive.Menu;
export const MenubarTrigger = MenubarPrimitive.Trigger;
export const MenubarContent = MenubarPrimitive.Content;
export const MenubarItem = MenubarPrimitive.Item;
export const Avatar = AvatarPrimitive.Root;
export const AvatarImage = AvatarPrimitive.Image;
export const AvatarFallback = AvatarPrimitive.Fallback;
export const Separator = SeparatorPrimitive.Root;
export const Toggle = TogglePrimitive.Root;
export const ToggleGroup = ToggleGroupPrimitive.Root;
export const ToggleGroupItem = ToggleGroupPrimitive.Item;
export const Accordion = AccordionPrimitive.Root;
export const AccordionItem = AccordionPrimitive.Item;
export const AccordionTrigger = AccordionPrimitive.Trigger;
export const AccordionContent = AccordionPrimitive.Content;
export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
export const CollapsibleContent = CollapsiblePrimitive.Content;
export const ScrollArea = ScrollAreaPrimitive.Root;
export const ScrollAreaViewport = ScrollAreaPrimitive.Viewport;
export function ResizablePanelGroup(props: React.ComponentProps<typeof PanelGroup>) {
  return <PanelGroup {...props} />;
}
export function ResizablePanel(props: React.ComponentProps<typeof Panel>) {
  return <Panel {...props} />;
}
export function ResizableHandle(props: React.ComponentProps<typeof PanelResizeHandle>) {
  return <PanelResizeHandle {...props} />;
}
export const CommandPalette = CommandPrimitive;

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200', className)} {...props} />;
}

export const Tag = Badge;
export const Chip = Badge;

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-lg border border-border bg-elevated text-foreground shadow-sm', className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800', className)} {...props} />;
}

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-6 w-6' };
  return <span className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', sizes[size], className)} aria-label="Loading" />;
}

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  return (
    <ProgressPrimitive.Root className={cx('relative h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800', className)} value={value}>
      <ProgressPrimitive.Indicator className="h-full bg-primary transition-transform" style={{ transform: `translateX(-${100 - value}%)` }} />
    </ProgressPrimitive.Root>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  );
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'success' | 'warning' | 'danger'; children: React.ReactNode }) {
  const tones = {
    info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-950 dark:bg-blue-950/40 dark:text-blue-100',
    success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-950 dark:bg-green-950/40 dark:text-green-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
    danger: 'border-red-200 bg-red-50 text-red-900 dark:border-red-950 dark:bg-red-950/40 dark:text-red-100',
  };
  return <div className={cx('rounded-md border px-4 py-3 text-sm', tones[tone])}>{children}</div>;
}

export const Callout = Banner;

export type TreeItem = { id: string; label: React.ReactNode; children?: TreeItem[] };
export function Tree({ items, level = 1 }: { items: TreeItem[]; level?: number }) {
  return (
    <ul role={level === 1 ? 'tree' : 'group'} className="space-y-1">
      {items.map((item) => (
        <li key={item.id} role="treeitem" aria-expanded={item.children ? true : undefined} className="rounded-sm px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900">
          {item.label}
          {item.children ? <Tree items={item.children} level={level + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

export type DataTableColumn<TData> = {
  id: string;
  header: React.ReactNode;
  accessor: (row: TData) => React.ReactNode;
  sortValue?: (row: TData) => string | number;
};

export type DataTableProps<TData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
};

export function DataTable<TData>({ columns, data }: DataTableProps<TData>) {
  const [sortId, setSortId] = React.useState<string | null>(null);
  const sortedData = React.useMemo(() => {
    if (!sortId) return data;
    const column = columns.find((item) => item.id === sortId);
    if (!column?.sortValue) return data;
    return [...data].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      return av > bv ? 1 : av < bv ? -1 : 0;
    });
  }, [columns, data, sortId]);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-950">
          <tr>
            {columns.map((column) => (
              <th key={column.id} className="border-b border-border px-3 py-2 text-left font-medium">
                <button type="button" className="inline-flex items-center gap-1" onClick={() => column.sortValue && setSortId(column.id)} disabled={!column.sortValue}>
                  {column.header}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-neutral-50 dark:hover:bg-neutral-950">
              {columns.map((column) => (
                <td key={column.id} className="border-b border-border px-3 py-2">
                  {column.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Form<TFieldValues extends FieldValues>({ form, children, onSubmit }: { form: UseFormReturn<TFieldValues>; children: React.ReactNode; onSubmit: (values: TFieldValues) => void | Promise<void> }) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>{children}</form>
    </FormProvider>
  );
}

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({ name, render }: { name: TName; render: (field: ReturnType<typeof useFormContext<TFieldValues>>['register']) => React.ReactNode }) {
  const form = useFormContext<TFieldValues>();
  return <>{render(form.register)}</>;
}

export function ControlledField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({ name, render }: { name: TName; render: Parameters<typeof Controller<TFieldValues, TName>>[0]['render'] }) {
  return <Controller name={name} render={render} />;
}

export function DatePicker(props: React.ComponentProps<typeof DayPicker>) {
  return <DayPicker className="rounded-md border border-border bg-elevated p-3" {...props} />;
}

export function FileDropzone({ onFiles, accept }: { onFiles: (files: File[]) => void; accept?: Record<string, string[]> }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onFiles, accept });
  return (
    <div {...getRootProps()} className={cx('flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center transition-colors', isDragActive && 'border-primary bg-blue-50 dark:bg-blue-950/30')}>
      <input {...getInputProps()} />
      <Upload className="h-5 w-5 text-muted" aria-hidden />
      <p className="text-sm text-muted">Drop files here or click to upload.</p>
    </div>
  );
}

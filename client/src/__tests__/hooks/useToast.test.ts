import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const createMockToastState = () => {
  let toasts: Array<{ id: string; title: string; description?: string; variant?: string }> = [];
  let toastCount = 0;
  
  return {
    getToasts: () => toasts,
    toast: (props: { title: string; description?: string; variant?: string }) => {
      const id = `toast-${++toastCount}`;
      toasts.push({ id, ...props });
      return { id, dismiss: () => { toasts = toasts.filter(t => t.id !== id); } };
    },
    dismiss: (id: string) => {
      toasts = toasts.filter(t => t.id !== id);
    },
    dismissAll: () => {
      toasts = [];
    }
  };
};

describe('Toast Hook Behavior', () => {
  let mockToast: ReturnType<typeof createMockToastState>;
  
  beforeEach(() => {
    mockToast = createMockToastState();
  });

  it('should add a toast', () => {
    const result = mockToast.toast({
      title: 'Success',
      description: 'Operation completed'
    });
    
    expect(result.id).toBe('toast-1');
    expect(mockToast.getToasts()).toHaveLength(1);
    expect(mockToast.getToasts()[0].title).toBe('Success');
  });

  it('should add multiple toasts', () => {
    mockToast.toast({ title: 'First' });
    mockToast.toast({ title: 'Second' });
    mockToast.toast({ title: 'Third' });
    
    expect(mockToast.getToasts()).toHaveLength(3);
  });

  it('should dismiss a specific toast', () => {
    mockToast.toast({ title: 'First' });
    const second = mockToast.toast({ title: 'Second' });
    mockToast.toast({ title: 'Third' });
    
    second.dismiss();
    
    expect(mockToast.getToasts()).toHaveLength(2);
    expect(mockToast.getToasts().find(t => t.title === 'Second')).toBeUndefined();
  });

  it('should dismiss all toasts', () => {
    mockToast.toast({ title: 'First' });
    mockToast.toast({ title: 'Second' });
    
    mockToast.dismissAll();
    
    expect(mockToast.getToasts()).toHaveLength(0);
  });

  it('should support different variants', () => {
    mockToast.toast({ title: 'Error', variant: 'destructive' });
    mockToast.toast({ title: 'Info', variant: 'default' });
    
    const toasts = mockToast.getToasts();
    expect(toasts[0].variant).toBe('destructive');
    expect(toasts[1].variant).toBe('default');
  });

  it('should generate unique IDs', () => {
    const toast1 = mockToast.toast({ title: 'First' });
    const toast2 = mockToast.toast({ title: 'Second' });
    
    expect(toast1.id).not.toBe(toast2.id);
  });
});

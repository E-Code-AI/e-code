import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Log to error reporting service (Sentry, etc.)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: mobileSpacing.xl,
    backgroundColor: mobileColors.background.primary
  },
  icon: {
    fontSize: 64,
    marginBottom: mobileSpacing.md
  },
  title: {
    fontSize: mobileTypography.fontSize.xl,
    fontWeight: '700',
    color: mobileColors.text.primary,
    marginBottom: mobileSpacing.sm,
    textAlign: 'center'
  },
  message: {
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text.secondary,
    textAlign: 'center',
    marginBottom: mobileSpacing.xl
  },
  button: {
    paddingHorizontal: mobileSpacing.xl,
    paddingVertical: mobileSpacing.md,
    backgroundColor: mobileColors.primary.default,
    borderRadius: mobileBorderRadius.lg
  },
  buttonText: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: '#fff'
  }
});

'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  autoRecover?: boolean
  recoveryDelay?: number
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  private recoveryTimer?: NodeJS.Timeout

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.log('ErrorBoundary caught error:', error)
    console.log('Error info:', errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Auto-recover if enabled
    if (this.props.autoRecover) {
      const delay = this.props.recoveryDelay || 100
      this.recoveryTimer = setTimeout(() => {
        this.setState({ hasError: false, error: undefined })
      }, delay)
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
    }
  }

  render() {
    if (this.state.hasError) {
      // If fallback is provided, render it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Otherwise, render a minimal loading state (will auto-recover)
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-pulse text-gray-500">กำลังโหลด...</div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

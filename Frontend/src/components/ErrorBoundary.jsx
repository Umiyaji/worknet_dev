import { Component } from "react";
import toast from "react-hot-toast";

const isDevelopment = import.meta.env.DEV;

/**
 * ✅ ERROR BOUNDARY COMPONENT
 *
 * Purpose: Catches React runtime errors and displays user-friendly messages
 * Prevents white screen of death and logs errors for debugging
 *
 * Usage: Wrap your component tree with <ErrorBoundary>
 * Example:
 *   <ErrorBoundary>
 *     <Navbar />
 *     <Router />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console for debugging
    console.error("❌ Error caught by Error Boundary:", error);
    console.error("📋 Error Info:", errorInfo);

    // Store error details in state
    this.setState({
      error,
      errorInfo,
    });

    // Show toast notification to user
    toast.error(`Something went wrong: ${error.message}`);

    // Optional: Send error to error tracking service (e.g., Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              ⚠️ Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              We encountered an error. Please try refreshing the page.
            </p>

            {/* Show error details in development mode */}
            {isDevelopment && this.state.error && (
              <details className="mb-4 text-left bg-gray-100 p-3 rounded text-xs">
                <summary className="cursor-pointer font-semibold text-gray-700">
                  Debug Info (Dev Only)
                </summary>
                <pre className="mt-2 overflow-auto text-red-600 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;




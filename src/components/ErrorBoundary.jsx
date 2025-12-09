import React from 'react';
import { Result, Button } from 'antd';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for developers
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // You can also log the error to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Optionally reload the page
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#EBF3FF',
          padding: '20px'
        }}>
          <Result
            status="error"
            title="Kaut kas nogāja greizi"
            subTitle="Radās neparedzēta kļūda. Lūdzu, mēģiniet atjaunot lapu vai doties uz sākumlapu."
            extra={[
              <Button
                type="primary"
                key="reload"
                icon={<ReloadOutlined />}
                onClick={this.handleReset}
                style={{ marginRight: 8 }}
              >
                Atjaunot lapu
              </Button>,
              <Button
                key="home"
                icon={<HomeOutlined />}
                onClick={this.handleGoHome}
              >
                Sākumlapa
              </Button>
            ]}
          >
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{
                marginTop: 24,
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 4,
                maxWidth: 800,
                textAlign: 'left'
              }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>
                    Tehniskā informācija (tikai izstrādes režīmā)
                  </summary>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 12,
                    color: '#666'
                  }}>
                    {this.state.error && this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;










import React from 'react';
import { Result, Button } from 'antd';
import { HomeOutlined, ReloadOutlined, MailOutlined } from '@ant-design/icons';
import { DEVELOPER_CONTACT } from '../utils/errorHandler';

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

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
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Log error to console (always, for debugging)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // In production, you can also log the error to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
    // if (isProduction) {
    //   Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    // }
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
      // In production: Show simple, user-friendly error page (NO technical details)
      // In development: Show error details for debugging
      
      if (isProduction) {
        // Production: Simple error page with NO technical information
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
              subTitle="Radās neparedzēta kļūda. Lūdzu, mēģiniet atjaunot lapu vai doties uz sākumlapu. Ja kļūda atkārtojas, lūdzu, sazinieties ar izstrādātāju."
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
                  style={{ marginRight: 8 }}
                >
                  Sākumlapa
                </Button>,
                <Button
                  key="contact"
                  icon={<MailOutlined />}
                  onClick={() => window.location.href = `mailto:${DEVELOPER_CONTACT.email}?subject=Application Error&body=Please describe the error you encountered.`}
                >
                  Sazināties ar izstrādātāju
                </Button>
              ]}
            />
          </div>
        );
      }

      // Development: Show error details for debugging
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
            {/* Only show error details in development */}
            {this.state.error && (
              <div style={{
                marginTop: 24,
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 4,
                maxWidth: 800,
                textAlign: 'left'
              }}>
                <details open>
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










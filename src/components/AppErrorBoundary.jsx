import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiAlertTriangle, FiRefreshCw } = FiIcons;

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected application error.'
    };
  }

  componentDidCatch(error, info) {
    console.error('AXiM application error', error, info);
  }

  reset() {
    this.setState({ hasError: false, message: '' });
  }


  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="error-shell">
        <section className="error-card">
          <div className="access-icon">
            <SafeIcon icon={FiAlertTriangle} />
          </div>
          <span className="kicker">System recovery</span>
          <h1>This workspace needs a refresh.</h1>
          <p>
            The dashboard encountered an unexpected rendering error. Your session
            remains available.
          </p>
          <code>{this.state.message}</code>
          <button className="primary-button" type="button" onClick={this.reset.bind(this)}>
            <SafeIcon icon={FiRefreshCw} />
            Try again
          </button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
import React from 'react';

type Props = { children: React.ReactNode };
type State = { error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};
  componentDidCatch(error: Error) { this.setState({ error }); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 12, background: '#fee', border: '1px solid #f99', margin: 12 }}>
          <strong>Something went wrong.</strong>
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{String(this.state.error.message || this.state.error)}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

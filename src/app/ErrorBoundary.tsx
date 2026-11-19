import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  /** Changing this key resets the boundary (e.g. on room change). */
  resetKey?: string;
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * A real error boundary. The copy is in character, but it is honest: something
 * actually broke, and the visitor can retry or go back to the Living Room.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[oddly-alive] scene crashed', error, info.componentStack);
    }
  }

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className={styles.wrap}>
        <p className={styles.kicker}>This one is actually broken.</p>
        <h2 className={styles.title}>The {this.props.label ?? 'room'} tripped over itself.</h2>
        <p className={styles.body}>
          A real error happened while drawing this scene. Nothing was sent anywhere.
        </p>
        <div className={styles.actions}>
          <button type="button" className="paper-btn" onClick={this.retry}>
            Try again
          </button>
          <a className="paper-btn" href="#/">
            Back to the Living Room
          </a>
        </div>
      </div>
    );
  }
}

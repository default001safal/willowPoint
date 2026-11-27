// Production crash surface: shows the real error instead of letting the OS
// report "app keeps stopping" with no detail. Render errors are caught by the
// boundary; global/async errors come through ErrorUtils and land here too.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { colors } from '../theme.js';

export default class CrashBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, componentStack: info?.componentStack || '' });
  }

  componentDidMount() {
    CrashBoundary.instance = this;
  }

  componentWillUnmount() {
    if (CrashBoundary.instance === this) CrashBoundary.instance = null;
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, padding: 24, paddingTop: 80 }}>
        <Text style={{ color: colors.crimson, fontSize: 20, marginBottom: 16 }}>willowPoint hit an error</Text>
        <ScrollView>
          <Text selectable style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
            {String(error && (error.stack || error.message || error))}
          </Text>
          {!!componentStack && (
            <Text selectable style={{ color: colors.muted, fontSize: 11, marginTop: 16, lineHeight: 17 }}>{componentStack}</Text>
          )}
        </ScrollView>
      </View>
    );
  }
}

if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (CrashBoundary.instance) {
      CrashBoundary.instance.setState({ error, componentStack: `(global handler, isFatal=${isFatal})` });
    } else {
      console.error('[willowPoint] global error:', error);
    }
  });
}

import { registerRootComponent } from 'expo';

let Root;
try {
  Root = require('./App.js').default;
} catch (error) {
  // A module-scope throw would otherwise kill the process silently. Show it.
  const React = require('react');
  const { ScrollView, Text, View } = require('react-native');
  Root = function StartupError() {
    return React.createElement(
      View,
      { style: { flex: 1, backgroundColor: '#0C0C0C', padding: 24, paddingTop: 80 } },
      React.createElement(Text, { style: { color: '#ED1725', fontSize: 18, marginBottom: 16 } }, 'willowPoint failed to start'),
      React.createElement(
        ScrollView,
        null,
        React.createElement(
          Text,
          { selectable: true, style: { color: '#EEEEEE', fontSize: 12, lineHeight: 18 } },
          String(error && (error.stack || error.message || error)),
        ),
      ),
    );
  };
}

registerRootComponent(Root);

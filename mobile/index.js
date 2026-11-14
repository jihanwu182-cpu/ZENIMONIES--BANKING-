
import React from 'react';
import { registerRootComponent } from 'expo';

import App from './App';
import { ThemeProvider } from './theme/ThemeContext';

function Root() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

registerRootComponent(Root);

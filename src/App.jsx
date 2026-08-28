import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppErrorBoundary from './components/AppErrorBoundary';
import AppRouter from './routes/AppRouter';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <AppRouter />
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
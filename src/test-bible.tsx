import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import { SeriesBibleView } from './views/SeriesBibleView';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div className="w-full h-screen">
      <SeriesBibleView />
    </div>
  </React.StrictMode>
);

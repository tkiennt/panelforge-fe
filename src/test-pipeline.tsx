import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import CharacterImagePipeline from './components/CharacterImagePipeline';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CharacterImagePipeline />
  </React.StrictMode>
);

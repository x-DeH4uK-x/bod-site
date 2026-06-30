import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/app/app.component';
import './global.scss';

const rootElem = document.getElementById('root');

if (rootElem) {
  const root = ReactDOM.createRoot(rootElem);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

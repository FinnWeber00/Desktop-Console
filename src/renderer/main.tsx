import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';
import { QuickSummon } from './QuickSummon';
import './i18n';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const view = params.get('view');
const RootComponent = view === 'quick' ? QuickSummon : App;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);


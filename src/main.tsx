import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// The admin dashboard is a separate lazily-loaded chunk, so visitors of the
// landing page never download it. Access is enforced by the server API.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const isAdminRoute = /^\/admin\/?$/.test(window.location.pathname);

if (isAdminRoute) {
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex, nofollow';
  document.head.appendChild(robots);
  document.title = 'Waitlist Admin – A Note';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdminRoute ? (
      <Suspense fallback={<div className="min-h-screen bg-brand-bg" />}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);

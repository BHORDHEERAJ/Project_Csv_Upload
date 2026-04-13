import './bootstrap';
import '../css/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { AuthProvider } from './context/AuthContext';
import { MappingProvider } from './context/MappingContext';
import App from './components/App';

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(
        <MantineProvider>
            <Notifications position="top-right" zIndex={2000} />
            <AuthProvider>
                <MappingProvider>
                    <App />
                </MappingProvider>
            </AuthProvider>
        </MantineProvider>
    );
}

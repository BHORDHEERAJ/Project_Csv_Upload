import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import Upload from '../pages/Upload';
import Preview from '../pages/Preview';
import MappingConfigUI from '../pages/MappingConfigUI';
import History from '../pages/History';
import Login from '../pages/Login';
import { useAuth } from '../context/AuthContext';

const App = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />

                {/* Private Routes (Wrapped in Layout) */}
                <Route 
                    path="/*" 
                    element={
                        isAuthenticated ? (
                            <MainLayout>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/upload" element={<Upload />} />
                                    <Route path="/preview" element={<Preview />} />
                                    <Route path="/settings" element={<MappingConfigUI />} />
                                    <Route path="/history" element={<History />} />
                                </Routes>
                            </MainLayout>
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    } 
                />
            </Routes>
        </Router>
    );
};

export default App;

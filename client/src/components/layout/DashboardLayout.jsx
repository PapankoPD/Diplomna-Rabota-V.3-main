import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import './DashboardLayout.css';

export const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = React.useState(true);

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <div className="content-area">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

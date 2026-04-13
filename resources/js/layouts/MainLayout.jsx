import React from 'react';
import { AppShell, Burger, Group, Text, ActionIcon, NavLink, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { LayoutDashboard, Upload, Settings, LogOut, Bell, User, FileText } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MainLayout = ({ children }) => {
    const [opened, { toggle }] = useDisclosure();
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Upload, label: 'Process Document', path: '/upload' },
        { icon: FileText, label: 'History', path: '/history' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <AppShell
            header={{ height: 70 }}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <Text size="xl" fw={700} c="indigo">TiPiC Mapper</Text>
                    </Group>
                    <Group>
                        <ActionIcon variant="light" color="gray" size="lg">
                            <Bell size={20} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="indigo" size="lg">
                            <User size={20} />
                        </ActionIcon>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <Box style={{ flex: 1 }}>
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            component={Link}
                            to={link.path}
                            label={link.label}
                            leftSection={<link.icon size={18} />}
                            active={location.pathname === link.path}
                            variant="light"
                            color="indigo"
                            style={{ borderRadius: 8, marginBottom: 4 }}
                        />
                    ))}
                </Box>
                <Box pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                    <NavLink
                        label="Logout"
                        leftSection={<LogOut size={18} />}
                        color="red"
                        variant="subtle"
                        onClick={handleLogout}
                        style={{ borderRadius: 8 }}
                    />
                </Box>
            </AppShell.Navbar>

            <AppShell.Main bg="gray.0">
                {children}
            </AppShell.Main>
        </AppShell>
    );
};

export default MainLayout;

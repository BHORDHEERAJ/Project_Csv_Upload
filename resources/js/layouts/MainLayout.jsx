import React, { useState } from 'react';
import { AppShell, Burger, Group, Text, ActionIcon, NavLink, Box, Modal, Button, Stack, Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { LayoutDashboard, Upload, Settings, LogOut, User, FileText, AlertTriangle, ChevronDown } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MainLayout = ({ children }) => {
    const [opened, { toggle, close }] = useDisclosure();
    const [logoutModalOpened, { open: openLogoutModal, close: closeLogoutModal }] = useDisclosure(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        closeLogoutModal();
        navigate('/login');
    };

    const navLinks = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Upload, label: 'Process Document', path: '/upload' },
        // { icon: FileText, label: 'History', path: '/history' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <AppShell
            header={{ height: 70 }}
            navbar={{
                width: { base: '50%', sm: 300 },
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
                        <Menu shadow="md" width={200} radius="md" position="bottom-end">
                            <Menu.Target>
                                <Button 
                                    variant="subtle" 
                                    color="gray" 
                                    leftSection={
                                        <Box bg="indigo.1" c="indigo" p={4} style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34 }}>
                                            <User size={20} />
                                        </Box>
                                    }
                                    rightSection={<ChevronDown size={14} />}
                                    styles={{ root: { paddingLeft: 4 } }}
                                >
                                    My Profile
                                </Button>
                            </Menu.Target>

                            <Menu.Dropdown>
                                <Menu.Label>Application</Menu.Label>
                                <Menu.Item leftSection={<Settings size={14} />} onClick={() => { close(); navigate('/settings'); }}>
                                    Settings
                                </Menu.Item>
                                
                                <Menu.Divider />

                                <Menu.Label>Danger zone</Menu.Label>
                                <Menu.Item 
                                    color="red" 
                                    leftSection={<LogOut size={14} />}
                                    onClick={() => { close(); openLogoutModal(); }}
                                >
                                    Log Out
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md" style={{ borderRight: 'none', borderBottomRightRadius: '24px', boxShadow: '10px 0 30px rgba(0,0,0,0.05)' }}>
                <Box style={{ flex: 1 }}>
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            component={Link}
                            to={link.path}
                            label={link.label}
                            leftSection={<link.icon size={18} />}
                            active={location.pathname === link.path}
                            onClick={close}
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
                        onClick={() => { close(); openLogoutModal(); }}
                        style={{ borderRadius: 8 }}
                    />
                </Box>
            </AppShell.Navbar>

            <Modal 
                opened={logoutModalOpened} 
                onClose={closeLogoutModal} 
                title="Confirm Logout" 
                centered
                radius="md"
            >
                <Stack>
                    <Group gap="sm">
                        <AlertTriangle color="var(--mantine-color-red-6)" />
                        <Text size="sm">Are you sure you want to logout? Any unsaved progress will be lost.</Text>
                    </Group>
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" color="gray" onClick={closeLogoutModal}>Cancel</Button>
                        <Button color="red" onClick={handleLogout}>Logout</Button>
                    </Group>
                </Stack>
            </Modal>

            <AppShell.Main bg="gray.0">
                {children}
            </AppShell.Main>
        </AppShell>
    );
};

export default MainLayout;

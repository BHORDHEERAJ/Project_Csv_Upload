import React, { useState, useEffect } from 'react';
import { Title, Text, SimpleGrid, Card, Group, Badge, Table, ActionIcon, Progress, Stack, LoadingOverlay } from '@mantine/core';
import { FileUp, CheckCircle, Clock, AlertCircle, Eye, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { notifications } from '@mantine/notifications';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState({
        total_uploads: 0,
        processing: 0,
        successful: 0,
        failed: 0
    });
    const [recentJobs, setRecentJobs] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/v1/dashboard');
                setStatsData(response.data.stats);
                setRecentJobs(response.data.recent_jobs);
            } catch (error) {
                console.error("Dashboard Data Error:", error);
                notifications.show({
                    title: 'Sync Error',
                    message: 'Could not fetch the latest dashboard data from the server.',
                    color: 'red',
                    icon: <AlertCircle size={16} />
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const stats = [
        { title: 'Total Uploads', value: statsData.total_uploads, icon: FileUp, color: 'indigo' },
        { title: 'Processing', value: statsData.processing, icon: Clock, color: 'blue' },
        { title: 'Successful', value: statsData.successful, icon: CheckCircle, color: 'teal' },
        { title: 'Failed', value: statsData.failed, icon: AlertCircle, color: 'red' },
    ];

    return (
        <Stack gap="lg" pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Title order={2} mb="xl">Dashboard Overview</Title>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                    {stats.map((stat, index) => (
                        <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
                            <Group justify="space-between" mb="xs">
                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                    {stat.title}
                                </Text>
                                <stat.icon size={20} color={`var(--mantine-color-${stat.color}-6)`} />
                            </Group>
                            <Group align="flex-end" gap="xs">
                                <Text size="xl" fw={700}>{stat.value}</Text>
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <Card shadow="sm" padding="xl" radius="md" withBorder mt="xl">
                    <Group justify="space-between" mb="lg">
                        <Title order={3}>Recent Processing Jobs</Title>
                        <Badge variant="light" color="indigo" size="lg">Last 30 Days</Badge>
                    </Group>

                    <Table.ScrollContainer minWidth={500}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>File Name</Table.Th>
                                    <Table.Th>Date</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Accuracy</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {recentJobs.length > 0 ? recentJobs.map((job) => (
                                    <Table.Tr key={job.id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <FileUp size={16} />
                                                <Text size="sm" fw={500}>{job.name}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed">{job.date}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={job.status === 'completed' ? 'teal' : job.status === 'failed' || job.status === 'cancelled' ? 'red' : 'blue'}
                                                variant="dot"
                                            >
                                                {job.status.toUpperCase()}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap="xs" style={{ width: 120 }}>
                                                <Text size="xs" fw={500}>{job.accuracy}</Text>
                                                {job.accuracy !== '---' && (
                                                    <Progress
                                                        value={parseFloat(job.accuracy) || 0}
                                                        color={parseFloat(job.accuracy) > 90 ? 'teal' : 'orange'}
                                                        size="xs"
                                                        style={{ flex: 1 }}
                                                    />
                                                )}
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={0} justify="flex-end">
                                                <ActionIcon variant="subtle" color="gray" onClick={() => notifications.show({ message: 'View feature coming soon.', color: 'blue' })}>
                                                    <Eye size={16} />
                                                </ActionIcon>
                                                {job.status === 'completed' && (
                                                    <ActionIcon variant="subtle" color="indigo" onClick={() => notifications.show({ message: 'Download ready.', color: 'teal', icon: <CheckCircle size={16} /> })}>
                                                        <Download size={16} />
                                                    </ActionIcon>
                                                )}
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                )) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={5}>
                                            <Text size="sm" c="dimmed" ta="center">No recent files processed.</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Card>
            </motion.div>
        </Stack>
    );
};

export default Dashboard;

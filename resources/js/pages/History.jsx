import React, { useState, useEffect } from 'react';
import { Title, Text, Card, Group, Badge, Table, Stack, LoadingOverlay, Pagination } from '@mantine/core';
import { Clock, CheckCircle, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

const History = () => {
    const [loading, setLoading] = useState(true);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:8000/api/v1/user/history?page=${currentPage}`);
                // Since pagination is used, response.data holds the paginated structure
                setHistoryLogs(response.data.data || []);
                setTotalPages(response.data.last_page || 1);
            } catch (error) {
                console.error("History fetch error:", error);
                notifications.show({
                    title: 'Fetch Error',
                    message: 'Could not fetch your processing history.',
                    color: 'red',
                    icon: <AlertCircle size={16} />
                });
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [currentPage]);

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'success':
            case 'completed':
                return <CheckCircle size={16} color="var(--mantine-color-teal-6)" />;
            case 'failed':
            case 'cancelled':
                return <AlertCircle size={16} color="var(--mantine-color-red-6)" />;
            case 'processing':
            case 'running':
                return <Loader2 size={16} color="var(--mantine-color-blue-6)" />;
            default:
                return <PlayCircle size={16} color="var(--mantine-color-indigo-6)" />;
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'success':
            case 'completed':
                return 'teal';
            case 'failed':
            case 'cancelled':
                return 'red';
            case 'processing':
            case 'running':
                return 'blue';
            default:
                return 'indigo';
        }
    };

    return (
        <Stack gap="lg" pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Group justify="space-between" mb="xs">
                    <Title order={2}>Activity History</Title>
                    <Badge variant="light" color="indigo" size="lg" leftSection={<Clock size={14} />}>
                        App Logs
                    </Badge>
                </Group>
                <Text c="dimmed" size="sm" mb="xl">
                    View a detailed history of your file uploads, transformations, exports, and errors.
                </Text>

                <Card shadow="sm" padding="xl" radius="md" withBorder>
                    <Table.ScrollContainer minWidth={600}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Event Date & Time</Table.Th>
                                    <Table.Th>Action Type</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>File / Details</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {historyLogs.length > 0 ? historyLogs.map((log) => (
                                    <Table.Tr key={log.id}>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" tt="uppercase" fw={700} c="dimmed">
                                                {log.action_type || 'System Event'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={getStatusBadgeColor(log.action_status)}
                                                variant="dot"
                                            >
                                                {log.action_status?.toUpperCase() || 'UNKNOWN'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap="sm">
                                                {getStatusIcon(log.action_status)}
                                                <Text size="sm">
                                                    {log.file ? log.file.original_name : (log.job?.customer_file ? log.job.customer_file.original_name : (log.job ? `Session: ${log.job.session_id?.substring(0,8) || log.job.id.substring(0,8)}` : 'General Activity'))}
                                                </Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            {log.job && (
                                                <Button 
                                                    size="compact-xs" 
                                                    variant="light" 
                                                    color="indigo" 
                                                    leftSection={<RefreshCw size={12} />}
                                                    onClick={() => navigate(`/preview?jobId=${log.job.id}`)}
                                                >
                                                    Reuse
                                                </Button>
                                            )}
                                        </Table.Td>
                                    </Table.Tr>
                                )) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={4}>
                                            <Text size="sm" c="dimmed" ta="center">You have no activity history yet.</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>

                    {totalPages > 1 && (
                        <Group justify="center" mt="xl">
                            <Pagination 
                                value={currentPage} 
                                onChange={setCurrentPage} 
                                total={totalPages} 
                                color="indigo" 
                                radius="md" 
                            />
                        </Group>
                    )}
                </Card>
            </motion.div>
        </Stack>
    );
};

export default History;

import React, { useState } from 'react';
import {
    TextInput,
    PasswordInput,
    Checkbox,
    Button,
    Paper,
    Title,
    Text,
    Container,
    Group,
    Box,
    Paper as MantinePaper,
    Stack,
    LoadingOverlay,
    Alert
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/v1/login', {
                email,
                password
            });

            if (response.data.access_token) {
                login(response.data.access_token);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box h="100vh" w="100vw" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--mantine-color-indigo-1) 0%, var(--mantine-color-blue-1) 100%)'
        }}>
            <Container size={420} my={40}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Title
                        ta="center"
                        order={1}
                        style={{ fontFamily: 'var(--font-sans)', fontWeight: 900 }}
                        mb="xs"
                        c="indigo.9"
                    >
                        TiPiC Mapper
                    </Title>
                    <Text c="dimmed" size="sm" ta="center" mb={30}>
                        Enterprise Document to CSV Automation
                    </Text>

                    <Paper withBorder shadow="xl" p={30} radius="lg" bg="white" style={{ position: 'relative' }}>
                        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ blur: 2 }} />
                        
                        <form onSubmit={handleSubmit}>
                            <Stack gap="md">
                                {error && (
                                    <Alert icon={<AlertCircle size={16} />} title="Error" color="red">
                                        {error}
                                    </Alert>
                                )}

                                <TextInput
                                    label="Email"
                                    placeholder="your@email.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.currentTarget.value)}
                                    leftSection={<Mail size={16} />}
                                    radius="md"
                                />

                                <PasswordInput
                                    label="Password"
                                    placeholder="Your password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.currentTarget.value)}
                                    leftSection={<Lock size={16} />}
                                    radius="md"
                                />

                                <Group justify="space-between" mt="xs">
                                    <Checkbox label="Remember me" size="sm" color="indigo" />
                                    <Text size="sm" c="indigo" style={{ cursor: 'pointer' }} fw={500}>
                                        Forgot password?
                                    </Text>
                                </Group>

                                <Button 
                                    fullWidth 
                                    mt="xl" 
                                    size="md" 
                                    type="submit" 
                                    color="indigo"
                                    radius="md"
                                    leftSection={<LogIn size={18} />}
                                    loading={loading}
                                >
                                    Sign in
                                </Button>
                            </Stack>
                        </form>
                    </Paper>

                    <Text ta="center" mt="xl" size="sm" c="dimmed">
                        Don't have an account?{' '}
                        <Text component="span" c="indigo" fw={700} style={{ cursor: 'pointer' }}>
                            Contact Support
                        </Text>
                    </Text>
                </motion.div>
            </Container>
        </Box>
    );
};

export default Login;

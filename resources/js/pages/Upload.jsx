import React, { useState } from 'react';
import { Title, Text, SimpleGrid, Card, Group, Button, Progress, List, ThemeIcon, Stack, Paper, Center } from '@mantine/core';
import { Dropzone, PDF_MIME_TYPE, MS_EXCEL_MIME_TYPE, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { FileUp, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMapping } from '../context/MappingContext';

const CSV_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/comma-separated-values', 'application/csv'];

const Upload = () => {
    const [document, setDocument] = useState(null);
    const [template, setTemplate] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const navigate = useNavigate();
    const { setExtractedData, setTemplateHeaders, setSourceColumns, setJobId } = useMapping();

    const handleProcess = async () => {
        if (!document) return;

        setIsProcessing(true);
        setStatus('Uploading documents to TiPiC Engine...');
        setProgress(10);
        
        try {
            const formData = new FormData();
            formData.append('document', document);
            if (template) formData.append('template', template);

            setStatus('Extracting data & performing OCR...');
            setProgress(40);

            const response = await axios.post('/api/v1/extract', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setStatus('Finalizing field extraction...');
                setProgress(90);
                
                // Update Global Mapping State
                setExtractedData(response.data.rows);
                setTemplateHeaders(response.data.templateHeaders || []);
                setSourceColumns(response.data.headers || []);
                if (response.data.job_id) setJobId(response.data.job_id);
                
                setTimeout(() => {
                    setProgress(100);
                    setIsProcessing(false);
                    setStatus('Extraction Complete!');
                }, 500);
            }
        } catch (err) {
            console.error(err);
            setStatus('Error: Failed to process document. Please try again.');
            setIsProcessing(false);
            setProgress(0);
        }
    };

    return (
        <Stack gap="xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Title order={2} mb="xs">Process New Document</Title>
                <Text c="dimmed">Upload your document and the TiPiC template to begin the automated mapping process.</Text>
            </motion.div>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                <Stack>
                    <Title order={4}>1. Customer Document</Title>
                    <Dropzone
                        onDrop={(files) => setDocument(files[0])}
                        maxSize={10 * 1024 ** 2}
                        accept={[...PDF_MIME_TYPE, ...MS_EXCEL_MIME_TYPE, ...IMAGE_MIME_TYPE, ...CSV_MIME_TYPES]}
                        loading={isProcessing}
                    >
                        <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
                            <Dropzone.Accept>
                                <FileUp size={52} color="var(--mantine-color-blue-6)" />
                            </Dropzone.Accept>
                            <Dropzone.Reject>
                                <AlertCircle size={52} color="var(--mantine-color-red-6)" />
                            </Dropzone.Reject>
                            <Dropzone.Idle>
                                <FileUp size={52} c="dimmed" />
                            </Dropzone.Idle>

                            <div>
                                <Text size="xl" inline>Drag document here or click to select</Text>
                                <Text size="sm" c="dimmed" inline mt={7}>
                                    Supports PDF, Excel, CSV and Image formats (max 10MB)
                                </Text>
                            </div>
                        </Group>
                    </Dropzone>
                    {document && (
                        <Paper withBorder p="xs" radius="md">
                            <Group gap="sm">
                                <ThemeIcon color="teal" variant="light"><Check size={16} /></ThemeIcon>
                                <Text size="sm">{document.name}</Text>
                            </Group>
                        </Paper>
                    )}
                </Stack>

                <Stack>
                    <Title order={4}>2. TiPiC CSV Template</Title>
                    <Dropzone
                        onDrop={(files) => setTemplate(files[0])}
                        maxSize={5 * 1024 ** 2}
                        accept={[...CSV_MIME_TYPES, ...MS_EXCEL_MIME_TYPE]}
                        loading={isProcessing}
                    >
                        <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
                            <Dropzone.Idle>
                                <FileText size={52} c="dimmed" />
                            </Dropzone.Idle>
                            <div>
                                <Text size="xl" inline>Drag template here</Text>
                                <Text size="sm" c="dimmed" inline mt={7}>
                                    Upload the standard TiPiC WMS CSV or Excel template
                                </Text>
                            </div>
                        </Group>
                    </Dropzone>
                    {template && (
                        <Paper withBorder p="xs" radius="md">
                            <Group gap="sm">
                                <ThemeIcon color="teal" variant="light"><Check size={16} /></ThemeIcon>
                                <Text size="sm">{template.name}</Text>
                            </Group>
                        </Paper>
                    )}
                </Stack>
            </SimpleGrid>

            <AnimatePresence>
                {document && template && !isProcessing && progress === 0 && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Center mt="xl">
                            <Button size="xl" color="indigo" leftSection={<Loader2 size={20} />} onClick={handleProcess}>
                                Start Processing
                            </Button>
                        </Center>
                    </motion.div>
                )}

                {isProcessing || progress > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Card withBorder padding="xl" radius="md">
                            <Stack gap="md">
                                <Group justify="space-between">
                                    <Text fw={700}>{status}</Text>
                                    <Text size="sm" c="dimmed">{progress}%</Text>
                                </Group>
                                <Progress value={progress} size="lg" radius="xl" animated={isProcessing} color="indigo" />
                                {progress === 100 && (
                                    <Button 
                                        fullWidth 
                                        color="teal" 
                                        mt="md" 
                                        size="md"
                                        onClick={() => navigate('/preview')}
                                    >
                                        View Extraction Results
                                    </Button>
                                )}
                            </Stack>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </Stack>
    );
};

export default Upload;

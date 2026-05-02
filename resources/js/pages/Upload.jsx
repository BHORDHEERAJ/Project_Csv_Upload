import React, { useState, useEffect } from 'react';
import { Title, Text, SimpleGrid, Card, Group, Button, Progress, List, ThemeIcon, Stack, Paper, Center, Select, SegmentedControl, ActionIcon, Tooltip, Badge } from '@mantine/core';
import { Dropzone, PDF_MIME_TYPE, MS_EXCEL_MIME_TYPE, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { FileUp, FileText, Check, AlertCircle, Loader2, Download, Info, Trash2, Edit3, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMapping } from '../context/MappingContext';
import * as XLSX from 'xlsx';
import ImageEditor from '../components/ImageEditor';

const CSV_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/comma-separated-values', 'application/csv'];

import { PREDEFINED_TEMPLATES, TEMPLATE_HEADERS_MAP } from '../config/templates';

const Upload = () => {
    const [documents, setDocuments] = useState([]);
    const [template, setTemplate] = useState(null);
    const [templateSource, setTemplateSource] = useState('predefined');
    const [selectedTemplateId, setSelectedTemplateId] = useState('profitsquare_products');
    
    // Image Editor State
    const [editingImage, setEditingImage] = useState(null);
    const [editingIndex, setEditingIndex] = useState(-1);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const navigate = useNavigate();
    const { setExtractedData, setTemplateHeaders, setSourceColumns, setJobId } = useMapping();

    // Reset processing state when target template changes
    useEffect(() => {
        if (!isProcessing && progress > 0) {
            setProgress(0);
            setStatus('');
        }
    }, [selectedTemplateId, templateSource, template]);

    const handleDownloadSample = () => {
        const config = TEMPLATE_HEADERS_MAP[selectedTemplateId];
        if (!config) return;

        if (config.format === 'xlsx') {
            const worksheet = XLSX.utils.aoa_to_sheet([config.headers, config.data]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
            XLSX.writeFile(workbook, `${selectedTemplateId}_sample.xlsx`);
        } else {
            const content = [config.headers.join(','), config.data.join(',')].join('\n');
            const blob = new Blob([content], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `${selectedTemplateId}_sample.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    };

    const handleProcess = async () => {
        if (documents.length === 0) return;
        if (templateSource === 'custom' && !template) return;

        setIsProcessing(true);
        setStatus(`Uploading ${documents.length} document(s)...`);
        setProgress(10);
        
        try {
            const formData = new FormData();
            documents.forEach(doc => {
                formData.append('document', doc);
            });
            
            if (templateSource === 'predefined') {
                formData.append('template_id', selectedTemplateId);
            } else if (template) {
                formData.append('template', template);
            }

            setStatus('Extracting data from multi-file batch...');
            setProgress(40);

            const response = await axios.post('/api/v1/extract', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000 // 5 minutes for large batches
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
            setStatus('Error: Failed to process documents. Please try again.');
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleEditImage = (index) => {
        const doc = documents[index];
        if (!doc.type.startsWith('image/')) return;
        
        setEditingIndex(index);
        setEditingImage(URL.createObjectURL(doc));
    };

    const handleSaveEditedImage = (blob) => {
        const newFile = new File([blob], documents[editingIndex].name, { type: 'image/jpeg' });
        const newDocs = [...documents];
        newDocs[editingIndex] = newFile;
        setDocuments(newDocs);
        setEditingImage(null);
        setEditingIndex(-1);
    };

    const handleRemoveDoc = (index) => {
        const newDocs = documents.filter((_, i) => i !== index);
        setDocuments(newDocs);
    };

    return (
        <Stack gap="xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Title order={2} mb="xs">Process New Documents</Title>
                <Text c="dimmed">Upload one or multiple files. Use the edit tool to crop or rotate images for better extraction.</Text>
            </motion.div>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                <Stack>
                    <Title order={4}>1. Source Documents</Title>
                    <Dropzone
                        onDrop={(files) => setDocuments([...documents, ...files])}
                        maxSize={20 * 1024 ** 2}
                        accept={[...PDF_MIME_TYPE, ...MS_EXCEL_MIME_TYPE, ...IMAGE_MIME_TYPE, ...CSV_MIME_TYPES]}
                        loading={isProcessing}
                    >
                        <Group justify="center" gap="xl" mih={200} style={{ pointerEvents: 'none' }}>
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
                                <Text size="xl" inline>Drag files here or click to select</Text>
                                <Text size="sm" c="dimmed" inline mt={7}>
                                    Supports PDF, Excel, CSV and Images (Max 20MB total)
                                </Text>
                            </div>
                        </Group>
                    </Dropzone>
                    
                    <Stack gap="xs">
                        {documents.map((doc, index) => (
                            <Paper key={index} withBorder p="xs" radius="md">
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                                        {doc.type.startsWith('image/') ? <ImageIcon size={18} /> : <FileText size={18} />}
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <Text size="sm" truncate>{doc.name}</Text>
                                            <Text size="xs" c="dimmed">{(doc.size / 1024).toFixed(1)} KB</Text>
                                        </div>
                                    </Group>
                                    <Group gap={4}>
                                        {doc.type.startsWith('image/') && (
                                            <Tooltip label="Crop or Rotate">
                                                <ActionIcon variant="subtle" color="indigo" onClick={() => handleEditImage(index)}>
                                                    <Edit3 size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        )}
                                        <ActionIcon variant="subtle" color="red" onClick={() => handleRemoveDoc(index)}>
                                            <Trash2 size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                </Stack>

                <Stack>
                    <Group justify="space-between" align="center">
                        <Title order={4}>2. Target Template</Title>
                        <SegmentedControl
                            value={templateSource}
                            onChange={setTemplateSource}
                            data={[
                                { label: 'Predefined', value: 'predefined' },
                                { label: 'Custom File', value: 'custom' },
                            ]}
                            size="xs"
                        />
                    </Group>

                    <Paper withBorder p="md" radius="md" mih={200}>
                        {templateSource === 'predefined' ? (
                            <Stack justify="center" align="stretch" h="100%">
                                <Select
                                    label="Select Predefined Template"
                                    placeholder="Choose target format"
                                    data={PREDEFINED_TEMPLATES}
                                    value={selectedTemplateId}
                                    onChange={setSelectedTemplateId}
                                    leftSection={<FileText size={16} />}
                                    mb="sm"
                                />
                                <Group gap="xs" mt="auto">
                                    <Button 
                                        variant="light" 
                                        color="blue" 
                                        fullWidth 
                                        leftSection={<Download size={16} />}
                                        onClick={handleDownloadSample}
                                    >
                                        Download Sample Template
                                    </Button>
                                    <Tooltip label="Using a predefined template speeds up processing as the system already knows the target headers.">
                                        <ActionIcon variant="subtle" color="gray">
                                            <Info size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Stack>
                        ) : (
                            <Stack gap="xs">
                                <Dropzone
                                    onDrop={(files) => setTemplate(files[0])}
                                    maxSize={5 * 1024 ** 2}
                                    accept={[...CSV_MIME_TYPES, ...MS_EXCEL_MIME_TYPE]}
                                    loading={isProcessing}
                                >
                                    <Group justify="center" gap="sm" mih={140} style={{ pointerEvents: 'none' }}>
                                        <Dropzone.Idle>
                                            <FileText size={32} c="dimmed" />
                                        </Dropzone.Idle>
                                        <Text size="sm" c="dimmed">Drag custom template here</Text>
                                    </Group>
                                </Dropzone>
                                {template && (
                                    <Paper withBorder p="xs" radius="md" bg="gray.0">
                                        <Group gap="sm">
                                            <ThemeIcon color="teal" variant="light"><Check size={16} /></ThemeIcon>
                                            <Text size="sm" truncate>{template.name}</Text>
                                        </Group>
                                    </Paper>
                                )}
                            </Stack>
                        )}
                    </Paper>
                </Stack>
            </SimpleGrid>

            <AnimatePresence>
                {documents.length > 0 && (templateSource === 'predefined' || template) && !isProcessing && progress === 0 && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Center mt="xl">
                            <Button size="xl" color="indigo" leftSection={<Loader2 size={20} />} onClick={handleProcess}>
                                Start Batch Extraction ({documents.length} files)
                            </Button>
                        </Center>
                    </motion.div>
                )}

                {(isProcessing || progress > 0) && (
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

            <ImageEditor 
                opened={!!editingImage} 
                onClose={() => setEditingImage(null)} 
                image={editingImage} 
                onSave={handleSaveEditedImage}
            />
        </Stack>
    );
};

export default Upload;

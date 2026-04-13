import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Title, Text, Table, Card, Group, Button, Badge, 
    ActionIcon, Stack, Paper, Center, Progress, 
    Box, Select, Alert, Divider, TextInput, Modal,
    SimpleGrid, ScrollArea, Flex
} from '@mantine/core';
import { 
    Download, Trash2, Edit2, Check, X, 
    FileSpreadsheet, Sparkles, Wand2, CheckCircle2,
    ArrowRightLeft, FileJson, Settings2, AlertCircle,
    RefreshCw, Save
} from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapping } from '../context/MappingContext';
import { useSearchParams } from 'react-router-dom';

const Preview = () => {
    const { 
        sourceColumns, setSourceColumns,
        templateHeaders, setTemplateHeaders,
        extractedData, setExtractedData,
        mapping, setMapping,
        jobId, setJobId,
        loadJobData
    } = useMapping();

    const [searchParams] = useSearchParams();
    const [isLoadingJob, setIsLoadingJob] = useState(false);

    const [isMapping, setIsMapping] = useState(true);
    const [mappingProgress, setMappingProgress] = useState(0);
    const [mappingStatus, setMappingStatus] = useState('Finalizing Field Alignment...');
    
    const [rawRows, setRawRows] = useState([]);
    const [userPrompt, setUserPrompt] = useState('');
    const [isTransforming, setIsTransforming] = useState(false);
    
    // Column-specific AI State
    const [activeCol, setActiveCol] = useState(null);
    const [colPrompt, setColPrompt] = useState('');
    const [colError, setColError] = useState(null);
    const [bulkPassword, setBulkPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchJob = async () => {
            const urlJobId = searchParams.get('jobId');
            if (urlJobId && urlJobId !== jobId) {
                setIsLoadingJob(true);
                try {
                    const res = await axios.get(`/api/v1/jobs/${urlJobId}`);
                    if (res.data.success) {
                        loadJobData(res.data.job);
                        // If job has extracted data but no mapped data yet, set it
                        if (res.data.job.extracted_data && (!res.data.job.mapped_data || res.data.job.mapped_data.length === 0)) {
                            setRawRows(res.data.job.extracted_data);
                        } else if (res.data.job.mapped_data) {
                            setRawRows(res.data.job.mapped_data);
                        }
                    }
                } catch (error) {
                    console.error("Failed to load job:", error);
                    notifications.show({ title: 'Error', message: 'Failed to load session history.', color: 'red' });
                } finally {
                    setIsLoadingJob(false);
                    setIsMapping(false); // Skip mapping animation for history loads
                }
            }
        };

        fetchJob();
    }, [searchParams]);

    useEffect(() => {
        if (extractedData && rawRows.length === 0) {
            setRawRows(extractedData);
        }
    }, [extractedData]);

    const handleSaveProgress = async () => {
        if (!jobId) return;
        setIsSaving(true);
        try {
            await axios.post(`/api/v1/jobs/${jobId}/save`, {
                rows: rawRows,
                headers: templateHeaders,
                source_columns: sourceColumns,
                mapping: mapping
            });
            notifications.show({
                title: 'Success',
                message: 'Processing progress saved to history.',
                color: 'green',
                icon: <Check size={16} />
            });
        } catch (error) {
            console.error('Save error:', error);
            notifications.show({
                title: 'Save Failed',
                message: 'Could not save your progress.',
                color: 'red'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAITransform = async () => {
        if (!userPrompt.trim()) return;
        
        setIsTransforming(true);
        setMappingStatus('AI Transformation in progress...');
        try {
            const response = await axios.post('/api/v1/ai-fix', {
                type: 'transform',
                data: { rows: rawRows, prompt: userPrompt }
            });
            
            if (response.data.success) {
                setRawRows(response.data.result);
                setUserPrompt('');
            }
        } catch (error) {
            console.error('AI Transformation failed:', error);
        } finally {
            setIsTransforming(false);
        }
    };

    const handleColumnAITransform = async () => {
        if (!colPrompt.trim() || !activeCol) return;
        
        setIsTransforming(true);
        setColError(null);
        try {
            const currentSourceCol = mapping[activeCol];
            const response = await axios.post('/api/v1/ai-fix', {
                type: 'transform',
                data: { 
                    rows: rawRows.map(row => ({ [currentSourceCol]: row[currentSourceCol] })), 
                    targetCol: activeCol,
                    sourceCol: currentSourceCol,
                    prompt: `Task: Transform data for the target column "${activeCol}". 
                    Currently, its values are taken from the source column "${currentSourceCol}". 
                    Instruction: ${colPrompt}. 
                    Please generate a new version of this data specifically for "${activeCol}". 
                    Return rows containing both the original "${currentSourceCol}" and the new "${activeCol}".` 
                }
            });
            
            if (response.data.success) {
                const transformedPart = response.data.result || [];
                // Merge transformed part back into original rows
                const newRows = rawRows.map((row, idx) => ({
                    ...row,
                    ...(transformedPart[idx] || {})
                }));
                
                setRawRows(newRows);

                // Smart Detection of New Columns in the merged result
                if (newRows.length > 0) {
                    const allKeys = Object.keys(newRows[0]);
                    const newKeys = allKeys.filter(k => !sourceColumns.includes(k));
                    
                    if (newKeys.length > 0) {
                        setSourceColumns(allKeys);
                        const exactMatch = newKeys.find(k => k.toLowerCase() === activeCol.toLowerCase());
                        if (exactMatch) {
                            setMapping(prev => ({ ...prev, [activeCol]: exactMatch }));
                        } else if (newKeys.length === 1) {
                            setMapping(prev => ({ ...prev, [activeCol]: newKeys[0] }));
                        }
                    }
                }

                setColPrompt('');
                setActiveCol(null);
                
                notifications.show({
                    title: 'Column Transformed',
                    message: `Applied AI transformation to ${activeCol}.`,
                    color: 'indigo'
                });
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            console.error('Column AI Fix failed:', errorMsg);
            setColError(errorMsg);
        } finally {
            setIsTransforming(false);
        }
    };

    const handleBulkPasswordUpdate = () => {
        if (!bulkPassword.trim()) return;
        
        const passwordHeader = templateHeaders.find(h => 
            h.toLowerCase().includes('pass') || 
            h.toLowerCase().includes('password')
        );

        if (!passwordHeader) {
            notifications.show({
                title: 'Mapping Error',
                message: "No 'Password' column found in the template headers.",
                color: 'red',
                icon: <X size={16} />
            });
            return;
        }

        const sourceCol = mapping[passwordHeader];
        if (!sourceCol) {
            notifications.show({
                title: 'Mapping Missing',
                message: `Please map a source column to '${passwordHeader}' first.`,
                color: 'yellow',
                icon: <AlertCircle size={16} />
            });
            return;
        }

        const newRows = rawRows.map(row => ({
            ...row,
            [sourceCol]: bulkPassword
        }));

        setRawRows(newRows);
        notifications.show({
            title: 'Bulk Update Complete',
            message: `Updated ${rawRows.length} passwords to the fixed value.`,
            color: 'teal',
            icon: <Check size={16} />
        });
        setBulkPassword('');
    };

    const handleAutoGeneratePasswords = () => {
        const passwordHeader = templateHeaders.find(h => 
            h.toLowerCase().includes('pass') || 
            h.toLowerCase().includes('password')
        );

        if (!passwordHeader) {
            notifications.show({
                title: 'Mapping Error',
                message: "No 'Password' column found in the template headers.",
                color: 'red',
                icon: <X size={16} />
            });
            return;
        }

        const sourceCol = mapping[passwordHeader];
        if (!sourceCol) {
            notifications.show({
                title: 'Mapping Missing',
                message: `Please map a source column to '${passwordHeader}' first.`,
                color: 'yellow',
                icon: <AlertCircle size={16} />
            });
            return;
        }

        const nameCol = sourceColumns.find(c => ['name', 'full name', 'employee name', 'customer name'].includes(c.toLowerCase()));
        const mobCol = sourceColumns.find(c => ['mobile', 'phone', 'contact', 'mobile number'].includes(c.toLowerCase()));
        const idCol = sourceColumns.find(c => ['emp id', 'employee id', 'id', 'code'].includes(c.toLowerCase()));
        const dateCol = sourceColumns.find(c => ['dob', 'date', 'joining', 'date of joining'].includes(c.toLowerCase()));

        const updatedRows = rawRows.map(row => {
            const namePart = (row[nameCol] || 'USR').toString().substring(0, 3).toUpperCase();
            const mobPart = (row[mobCol] || '000').toString().slice(-3);
            const idPart = (row[idCol] || '').toString().slice(-3);
            const datePart = (row[dateCol] || '').toString().replace(/[^0-9]/g, '').slice(0, 4);
            
            const randomSuffix = Math.floor(Math.random() * 90 + 10);
            const generatedPassword = `${namePart}${mobPart}@${idPart || datePart || randomSuffix}`;

            return {
                ...row,
                [sourceCol]: generatedPassword
            };
        });

        setRawRows(updatedRows);
        notifications.show({
            title: 'Auto-Generation Complete',
            message: `Unique passwords generated for ${rawRows.length} employees.`,
            color: 'indigo',
            icon: <Check size={16} />
        });
    };

    // Smart Auto-Mapping Effect
    useEffect(() => {
        if (sourceColumns.length > 0 && templateHeaders.length > 0) {
            const newMapping = { ...mapping };
            templateHeaders.forEach(header => {
                // If not already mapped, try to find a smart match
                if (!newMapping[header]) {
                    const match = sourceColumns.find(col => 
                        col.toLowerCase().includes(header.toLowerCase()) || 
                        header.toLowerCase().includes(col.toLowerCase())
                    );
                    if (match) newMapping[header] = match;
                }
            });
            setMapping(newMapping);
        }
    }, [sourceColumns, templateHeaders]);
    useEffect(() => {
        const interval = setInterval(() => {
            setMappingProgress((p) => {
                if (p >= 100) {
                    clearInterval(interval);
                    setTimeout(() => setIsMapping(false), 600);
                    return 100;
                }
                return p + 10;
            });
        }, 150);
        return () => clearInterval(interval);
    }, []);

    const updateMapping = (templateHeader, sourceColumn) => {
        if (!sourceColumn) {
            setMapping(prev => ({ ...prev, [templateHeader]: null }));
            return;
        }

        // Check if this source column is already mapped to ANOTHER header
        const otherHeader = Object.keys(mapping).find(h => h !== templateHeader && mapping[h] === sourceColumn);
        
        if (otherHeader) {
            // Already in use. Create a virtual copy to isolate changes.
            const virtualColName = `${sourceColumn} (${templateHeader})`;
            
            // 1. Add to source columns if not already there
            if (!sourceColumns.includes(virtualColName)) {
                setSourceColumns(prev => [...prev, virtualColName]);
            }

            // 2. Clone data for this column in all rows
            setRawRows(prev => prev.map(row => ({
                ...row,
                [virtualColName]: row[sourceColumn]
            })));

            // 3. Set mapping to the virtual column
            setMapping(prev => ({ ...prev, [templateHeader]: virtualColName }));
            
            notifications.show({
                title: 'Column Isolated',
                message: `Created independent copy of '${sourceColumn}' for '${templateHeader}'.`,
                color: 'blue',
                size: 'xs'
            });
        } else {
            // New mapping or unique mapping. Just update standard state.
            setMapping(prev => ({ ...prev, [templateHeader]: sourceColumn }));
        }
    };

    const fixRowWithAI = async (idx) => {
        try {
            const response = await axios.post('/api/v1/ai-fix', {
                type: 'row',
                data: rawRows[idx],
                config: { headers: templateHeaders }
            });
            if (response.data.success) {
                const newRows = [...rawRows];
                newRows[idx] = response.data.result;
                setRawRows(newRows);
            }
        } catch (error) {
            console.error('AI Fix failed:', error);
        }
    };

    const downloadFile = async (format) => {
        try {
            setMappingStatus(`Generating ${format.toUpperCase()}...`);
            
            // Transform rawRows into the final mapped structure based on user configuration
            const mappedRows = rawRows.map(row => {
                const newRow = {};
                templateHeaders.forEach(header => {
                    newRow[header] = row[mapping[header]] || '';
                });
                return newRow;
            });

            const res = await axios.post('/api/v1/export', {
                rows: mappedRows,
                headers: templateHeaders,
                source_columns: sourceColumns,
                mapping: mapping,
                format: format,
                job_id: jobId
            }, {
                responseType: 'blob'
            });

            notifications.show({
                title: 'Export Successful',
                message: `Your data has been exported as ${format.toUpperCase()}`,
                color: 'teal',
                icon: <Check size={16} />
            });

            // Create download link for the binary blob
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `TiPiC_Mapped_Export.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
        } catch (error) {
            console.error('Export failed:', error);
            notifications.show({
                title: 'Export Failed',
                message: 'Failed to generate export file. Please ensure the backend service is running.',
                color: 'red',
                icon: <X size={16} />
            });
        }
    };

    if (isMapping) {
        return (
            <Center h="70vh">
                <Stack align="center" gap="xl" w="100%" maxWidth={500}>
                    <Wand2 size={48} color="var(--mantine-color-indigo-6)" />
                    <Title order={2}>Engineers' Magic Processing...</Title>
                    <Text c="dimmed">Aligning Customer Data to TiPiC Sample Headers</Text>
                    <Progress value={mappingProgress} w="100%" size="xl" radius="xl" animated color="indigo" />
                </Stack>
            </Center>
        );
    }

    return (
        <Stack gap="xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Group justify="space-between" mb="xl">
                    <Stack gap={0}>
                        <Title order={2}>Interactive Mapping Preview</Title>
                        <Text c="dimmed">Fine-tune the field mapping before downloading the final file.</Text>
                    </Stack>
                    <Group>
                        <Button variant="outline" color="indigo" onClick={() => downloadFile('xlsx')} leftSection={<FileSpreadsheet size={18} />}>
                            Download as Excel (.xlsx)
                        </Button>
                        <Button color="indigo" onClick={() => downloadFile('csv')} leftSection={<Download size={18} />}>
                            Download as CSV (.utf8)
                        </Button>
                    </Group>
                </Group>

                <Alert icon={<Settings2 size={18} />} title="Smart Mapping Interface" color="indigo" variant="light" mb="xl">
                    The data below has been automatically extracted and mapped based on your uploaded files.
                </Alert>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl" mb="xl">
                    <Card withBorder radius="md" padding="lg">
                        <Title order={4} mb="md">Mapping Configuration</Title>
                        <Text size="xs" c="dimmed" mb="md">Map your source document columns to the TiPiC standard format.</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            {templateHeaders.map(header => (
                                <Paper key={header} withBorder p="xs" radius="sm" bg="var(--mantine-color-gray-0)">
                                    <Stack gap={4}>
                                        <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>{header} *</Text>
                                        <Select
                                            placeholder="Select column"
                                            data={sourceColumns}
                                            value={mapping[header]}
                                            onChange={(val) => updateMapping(header, val)}
                                            size="sm"
                                            clearable
                                            searchable
                                        />
                                    </Stack>
                                </Paper>
                            ))}
                        </SimpleGrid>
                        <Button
                            mt="md"
                            variant="light"
                            color="cyan"
                            fullWidth
                            leftSection={<Sparkles size={16} />}
                            onClick={async () => {
                                setMappingStatus('AI Suggesting Mappings...');
                                setIsMapping(true);
                                try {
                                    const response = await axios.post('/api/v1/ai-fix', {
                                        type: 'mapping',
                                        data: { sourceColumns, templateHeaders }
                                    });
                                    if (response.data.success) {
                                        setMapping(response.data.result);
                                    }
                                } finally {
                                    setIsMapping(false);
                                }
                            }}
                        >
                            AI Suggest Mapping
                        </Button>
                    </Card>

                    <Card withBorder radius="md" padding="lg" bg="gray.0">
                        <Title order={4} mb="md">Detected Source Fields</Title>
                        <Text size="xs" c="dimmed" mb="md">These fields were successfully extracted from your customer document:</Text>
                        <Group gap="xs">
                            {sourceColumns.map(col => (
                                <Badge key={col} variant="outline" color="gray" radius="sm" size="sm">
                                    {col}
                                </Badge>
                            ))}
                            {sourceColumns.length === 0 && (
                                <Alert color="red" icon={<AlertCircle size={16} />} title="No Headers Found" variant="light" w="100%">
                                    The engine could not find any headers in the customer document. Please check the file format.
                                </Alert>
                            )}
                        </Group>
                    </Card>

                    <Card withBorder radius="md" padding="lg" style={{ borderLeft: '4px solid var(--mantine-color-teal-6)' }}>
                        <Title order={4} mb="xs">Bulk Password Update</Title>
                        <Text size="xs" c="dimmed" mb="md">Set the same password for all records instantly.</Text>
                        <Stack gap="sm">
                            <Group grow align="flex-end">
                                <TextInput 
                                    label="Fixed Password"
                                    placeholder="Enter password..."
                                    value={bulkPassword}
                                    onChange={(e) => setBulkPassword(e.currentTarget.value)}
                                    size="sm"
                                />
                                <Button 
                                    variant="filled" 
                                    color="teal" 
                                    onClick={handleBulkPasswordUpdate}
                                    disabled={!bulkPassword.trim()}
                                    leftSection={<Check size={16} />}
                                    size="sm"
                                >
                                    Apply
                                </Button>
                            </Group>

                            <Divider label="OR" labelPosition="center" my="xs" />

                            <Button 
                                variant="outline" 
                                color="indigo" 
                                fullWidth
                                leftSection={<RefreshCw size={16} />}
                                onClick={handleAutoGeneratePasswords}
                            >
                                Auto-Generate (Unique Passwords)
                            </Button>
                        </Stack>
                    </Card>
                </SimpleGrid>

                <Card withBorder radius="md" mb="xl" padding="lg" shadow="sm" style={{ borderLeft: '4px solid var(--mantine-color-indigo-6)' }}>
                    <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                            <Wand2 size={20} color="var(--mantine-color-indigo-6)" />
                            <Title order={4}>Smart AI Assistant</Title>
                        </Group>
                        {isTransforming && <Badge variant="dot" color="indigo">AI is thinking...</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                        Type an instruction to modify all extracted data at once. (e.g., "Translate names to Marathi", "Clean up currency", "Format dates as DD-MM-YYYY")
                    </Text>
                    <Flex 
                        direction={{ base: 'column', sm: 'row' }} 
                        gap="md" 
                        align={{ base: 'stretch', sm: 'flex-end' }}
                    >
                        <TextInput
                            placeholder="Enter transformation instruction..."
                            style={{ flex: 1 }}
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.currentTarget.value)}
                            disabled={isTransforming}
                            onKeyDown={(e) => e.key === 'Enter' && handleAITransform()}
                            size="md"
                        />
                        <Button 
                            variant="light" 
                            color="indigo" 
                            leftSection={<Save size={18} />}
                            onClick={handleSaveProgress}
                            loading={isSaving}
                            disabled={!jobId}
                        >
                            Save Progress
                        </Button>

                        <Button 
                            color="indigo" 
                            leftSection={<Sparkles size={16} />}
                            loading={isTransforming}
                            onClick={handleAITransform}
                            size="md"
                        >
                            Apply Magic
                        </Button>
                    </Flex>
                </Card>

                <Divider label="Data Preview (Mapped Result)" labelPosition="center" mb="xl" />

                <Card shadow="sm" radius="md" withBorder padding={0}>
                    <Table.ScrollContainer minWidth={800}>
                        <Table verticalSpacing="md" highlightOnHover striped withColumnBorders>
                            <Table.Thead bg="indigo.0">
                                <Table.Tr>
                                    {templateHeaders.map(header => (
                                        <Table.Th key={header} c="indigo.9" fw={900}>
                                            <Group gap="xs" justify="space-between" wrap="nowrap">
                                                {header}
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color="indigo" 
                                                    size="xs" 
                                                    onClick={() => setActiveCol(header)}
                                                    title={`AI actions for ${header}`}
                                                >
                                                    <Sparkles size={12} />
                                                </ActionIcon>
                                            </Group>
                                        </Table.Th>
                                    ))}
                                    <Table.Th w={50}></Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rawRows.map((row, idx) => (
                                    <Table.Tr key={idx}>
                                        {templateHeaders.map(header => {
                                            const sourceCol = mapping[header];
                                            const value = row[sourceCol] || '';
                                            return (
                                                <Table.Td key={header}>
                                                    <TextInput
                                                        variant="unstyled"
                                                        size="xs"
                                                        value={value}
                                                        onChange={(e) => {
                                                            const newRows = [...rawRows];
                                                            newRows[idx][sourceCol] = e.currentTarget.value;
                                                            setRawRows(newRows);
                                                        }}
                                                        styles={{
                                                            input: { 
                                                                minHeight: 'unset', 
                                                                height: 'auto', 
                                                                padding: '4px 8px',
                                                                '&:focus': { backgroundColor: 'var(--mantine-color-indigo-0)' }
                                                            }
                                                        }}
                                                    />
                                                </Table.Td>
                                            );
                                        })}
                                        <Table.Td>
                                            <Group gap="xs" wrap="nowrap">
                                                <ActionIcon 
                                                    variant="light" 
                                                    color="cyan" 
                                                    size="sm" 
                                                    onClick={() => fixRowWithAI(idx)}
                                                    title="Fix with AI"
                                                >
                                                    <Sparkles size={14} />
                                                </ActionIcon>
                                                <ActionIcon variant="light" color="red" size="sm" onClick={() => {
                                                    const newRows = rawRows.filter((_, i) => i !== idx);
                                                    setRawRows(newRows);
                                                }}>
                                                    <Trash2 size={14} />
                                                </ActionIcon>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                                {rawRows.length === 0 && (
                                    <Table.Tr>
                                        <Table.Td colSpan={templateHeaders.length + 1}>
                                            <Center py="xl">
                                                <Text c="dimmed">No data available to preview.</Text>
                                            </Center>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Card>

                {/* Column specific AI Modal */}
                <Modal 
                    opened={!!activeCol} 
                    onClose={() => {
                        setActiveCol(null);
                        setColError(null);
                    }} 
                    title={<Group gap="xs"><Sparkles size={18} color="var(--mantine-color-indigo-6)" /><Text fw={700}>AI Assistant: {activeCol}</Text></Group>}
                    centered
                    radius="md"
                    overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
                >
                    <Stack>
                        <Text size="sm">
                            What would you like the AI to do with the **{activeCol}** column for all {rawRows.length} rows?
                        </Text>
                        
                        {colError && (
                            <Alert icon={<AlertCircle size={16} />} title="AI Error" color="red" variant="light">
                                {colError}
                            </Alert>
                        )}

                        <TextInput 
                            placeholder='e.g. "Set password to demo123", "Clean up dates"'
                            value={colPrompt}
                            onChange={(e) => setColPrompt(e.currentTarget.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleColumnAITransform()}
                            data-autofocus
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="light" color="gray" onClick={() => setActiveCol(null)}>Cancel</Button>
                            <Button 
                                color="indigo" 
                                leftSection={<Sparkles size={16} />}
                                onClick={handleColumnAITransform}
                                loading={isTransforming}
                            >
                                Apply to Column
                            </Button>
                        </Group>
                    </Stack>
                </Modal>
            </motion.div>
        </Stack>
    );
};

export default Preview;

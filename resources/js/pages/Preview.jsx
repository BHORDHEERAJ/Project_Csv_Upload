import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Title, Text, Table, Card, Group, Button, Badge, 
    ActionIcon, Stack, Paper, Center, Progress, 
    Box, Select, Alert, Divider, TextInput, Modal,
    SimpleGrid, ScrollArea, Flex, Grid
} from '@mantine/core';
import { 
    Download, Trash2, Edit2, Check, X, 
    FileSpreadsheet, Sparkles, Wand2, CheckCircle2,
    ArrowRightLeft, FileJson, Settings2, AlertCircle,
    RefreshCw, Save, Search, CheckSquare, Square
} from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapping } from '../context/MappingContext';
import { useSearchParams } from 'react-router-dom';
import { Checkbox } from '@mantine/core';

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

    // Search and Selection
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState(new Set());

    const hasPasswordHeader = templateHeaders.some(h => 
        h.toLowerCase().includes('pass') || h.toLowerCase().includes('password')
    );

    const filteredRows = rawRows.filter(row => 
        Object.values(row).some(val => 
            String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const toggleRow = (idx) => {
        const next = new Set(selectedRows);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedRows(next);
    };

    const toggleAll = () => {
        if (selectedRows.size === filteredRows.length) setSelectedRows(new Set());
        else {
            const next = new Set();
            rawRows.forEach((_, i) => next.add(i));
            setSelectedRows(next);
        }
    };

    // Drag to fill state
    const [dragStart, setDragStart] = useState(null); // { rowIdx, colName }
    const [dragEnd, setDragEnd] = useState(null); // rowIdx
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                handleFinishDrag();
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging, dragStart, dragEnd, rawRows]);

    const handleStartDrag = (rowIdx, colName) => {
        setDragStart({ rowIdx, colName });
        setDragEnd(rowIdx);
        setIsDragging(true);
    };

    const handleHoverDrag = (rowIdx) => {
        if (isDragging) {
            setDragEnd(rowIdx);
        }
    };

    const handleFinishDrag = () => {
        if (!isDragging || !dragStart) {
            setIsDragging(false);
            setDragStart(null);
            return;
        }

        const { rowIdx: startRow, colName } = dragStart;
        const endRow = dragEnd;

        if (startRow !== endRow) {
            const newRows = [...rawRows];
            const baseValue = rawRows[startRow][colName];
            
            const minRow = Math.min(startRow, endRow);
            const maxRow = Math.max(startRow, endRow);

            for (let i = minRow; i <= maxRow; i++) {
                if (i === startRow) continue;
                
                const step = i - startRow;
                newRows[i][colName] = incrementValue(baseValue || '', step);
            }
            setRawRows(newRows);
            notifications.show({
                title: 'Sequence Filled',
                message: `Automatically updated ${Math.abs(startRow - endRow) + 1} cells in ${colName}.`,
                color: 'blue'
            });
        }

        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
    };

    const incrementValue = (val, step) => {
        if (!val) return '';
        // If it's a pure number
        if (!isNaN(parseFloat(val)) && isFinite(val) && !val.toString().startsWith('0')) {
            return (parseFloat(val) + step).toString();
        }
        // If it ends with numbers (e.g. USER01)
        const match = val.match(/(.*?)(\d+)$/);
        if (match) {
            const prefix = match[1];
            const numStr = match[2];
            const num = parseInt(numStr);
            const nextNum = (num + step).toString();
            const paddedNum = nextNum.padStart(numStr.length, '0');
            return prefix + paddedNum;
        }
        return val;
    };

    useEffect(() => {
        const fetchJob = async () => {
            const urlJobId = searchParams.get('jobId');
            if (urlJobId && urlJobId !== jobId) {
                setIsLoadingJob(true);
                try {
                    const res = await axios.get(`/api/v1/jobs/${urlJobId}`);
                    if (res.data.success) {
                        loadJobData(res.data.job);
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
                    setIsMapping(false);
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
                const currentSourceCol = mapping[activeCol];

                // Revert to Direct Replacement: Update the original source column values
                const newRows = rawRows.map((row, idx) => {
                    const aiResult = transformedPart[idx] || {};
                    const aiKeys = Object.keys(aiResult);
                    
                    // Match the best key from AI response
                    const valKey = aiKeys.find(k => k.toLowerCase() === activeCol.toLowerCase()) ||
                                   aiKeys.find(k => k.toLowerCase().includes('new')) ||
                                   aiKeys.find(k => k !== currentSourceCol) ||
                                   currentSourceCol;
                    
                    const newValue = aiResult[valKey] !== undefined ? aiResult[valKey] : (row[currentSourceCol] || '');
                    
                    return {
                        ...row,
                        [currentSourceCol]: newValue
                    };
                });
                
                setRawRows(newRows);
                setColPrompt('');
                setActiveCol(null);
                
                notifications.show({
                    title: 'Magic Applied!',
                    message: `TiPiC AI updated the data for "${activeCol}" in your original column.`,
                    color: 'indigo',
                    icon: <Check size={16} />
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

        const newRows = rawRows.map((row, idx) => {
            if (selectedRows.size > 0 && !selectedRows.has(idx)) return row;
            return {
                ...row,
                [sourceCol]: bulkPassword
            };
        });

        setRawRows(newRows);
        notifications.show({
            title: 'Bulk Update Complete',
            message: selectedRows.size > 0 
                ? `Updated passwords for ${selectedRows.size} selected rows.`
                : `Updated passwords for all ${rawRows.length} rows.`,
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

        // Identify the correct source columns using the current mapping configuration
        const getNameCol = () => {
            const h = templateHeaders.find(t => t.toLowerCase().includes('name'));
            return mapping[h];
        };
        const getMobCol = () => {
            const h = templateHeaders.find(t => t.toLowerCase().includes('mobile'));
            return mapping[h];
        };
        const getDateCol = () => {
            const h = templateHeaders.find(t => t.toLowerCase().includes('date') || t.toLowerCase().includes('dob') || t.toLowerCase().includes('doj'));
            return mapping[h];
        };

        const nameCol = getNameCol();
        const mobCol = getMobCol();
        const dateCol = getDateCol();

        const updatedRows = rawRows.map((row, idx) => {
            if (selectedRows.size > 0 && !selectedRows.has(idx)) return row;

            // Name: First 3 letters from the designated Name column
            let namePart = (nameCol && row[nameCol] ? row[nameCol] : 'USR').toString().trim().substring(0, 3);
            if (namePart.length < 3) namePart = namePart.padEnd(3, 'X');
            
            // Mobile: Last 3 numbers from the designated Mobile column
            const mobRaw = (mobCol && row[mobCol] ? row[mobCol] : '000').toString().replace(/[^0-9]/g, '');
            let mobPart = mobRaw.slice(-3);
            if (mobPart.length < 3) mobPart = mobPart.padStart(3, '0');
            
            // DOB/DOJ: Just the date (day part)
            let dobPart = '01';
            const dobRaw = (row[dateCol] || '').toString().trim();
            if (dobRaw) {
                // Handle various formats: 2024-01-05 or 05-01-2024 or 05/01/2024
                const parts = dobRaw.split(/[-/]/);
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        // YYYY-MM-DD -> Take DD (last part)
                        dobPart = parts[2].substring(0, 2).padStart(2, '0');
                    } else {
                        // DD-MM-YYYY -> Take DD (first part)
                        dobPart = parts[0].padStart(2, '0');
                    }
                } else {
                    // Fallback to first number found
                    const dateMatch = dobRaw.match(/(\d{1,2})/);
                    if (dateMatch) dobPart = dateMatch[1].padStart(2, '0');
                }
            } else {
                dobPart = '00'; 
            }
            
            const generatedPassword = `${namePart}${mobPart}@${dobPart}`;

            return {
                ...row,
                [sourceCol]: generatedPassword
            };
        });

        setRawRows(updatedRows);
        notifications.show({
            title: 'Auto-Generation Complete',
            message: selectedRows.size > 0
                ? `Unique passwords generated for ${selectedRows.size} selected items.`
                : `Unique passwords generated for ${rawRows.length} employees.`,
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

    const [isDownloading, setIsDownloading] = useState(false);

    const downloadFile = async (format) => {
        if (rawRows.length === 0) {
            notifications.show({
                title: 'No Data',
                message: 'There is no data to export.',
                color: 'yellow'
            });
            return;
        }

        try {
            setIsDownloading(true);
            setMappingProgress(20);
            setMappingStatus(`Preparing ${format.toUpperCase()} file...`);
            setIsMapping(true); // Show the magic processing screen
            
            // USE FILTERED ROWS instead of rawRows to support downloading "filtered data"
            const dataToExport = filteredRows.length > 0 ? filteredRows : rawRows;

            // Transform data into the final mapped structure
            const mappedRows = dataToExport.map(row => {
                const newRow = {};
                templateHeaders.forEach(header => {
                    const sourceKey = mapping[header];
                    newRow[header] = sourceKey ? row[sourceKey] : '';
                });
                return newRow;
            });

            setMappingProgress(50);
            setMappingStatus(`Generating ${format.toUpperCase()} on server...`);

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

            setMappingProgress(90);
            setMappingStatus('Finalizing download...');

            // Create download link for the binary blob
            const blob = new Blob([res.data], { 
                type: format === 'xlsx' 
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                    : 'text/csv; charset=utf-8' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `TiPiC_Export_${new Date().getTime()}.${format}`);
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(link);
            }, 100);

            notifications.show({
                title: 'Export Successful',
                message: `Your data has been exported as ${format.toUpperCase()}`,
                color: 'teal',
                icon: <Check size={16} />
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            const errorMsg = error.response?.data?.error || 'Failed to generate export file. Please check your connection.';
            
            notifications.show({
                title: 'Export Failed',
                message: errorMsg,
                color: 'red',
                icon: <X size={16} />
            });
        } finally {
            setIsDownloading(false);
            setIsMapping(false);
            setMappingProgress(0);
        }
    };

    if (isMapping) {
        return (
            <Center h="70vh">
                <Stack align="center" gap="xl" w="100%" style={{ maxWidth: 500 }}>
                    <motion.div
                        animate={{ 
                            rotate: [0, 10, -10, 10, 0],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <Wand2 size={64} color="var(--mantine-color-indigo-6)" />
                    </motion.div>
                    
                    <Stack gap={5} align="center">
                        <Title order={2}>AI Engineers at Work...</Title>
                        <Text c="dimmed" size="sm">Aligning Customer Data to TiPiC Standard Format</Text>
                    </Stack>

                    <Box w="100%">
                        <Group justify="space-between" mb="xs">
                            <Text size="xs" fw={700} c="indigo">PROCESSING ENGINE</Text>
                            <Text size="xs" fw={700} c="indigo">{mappingProgress}% Complete</Text>
                        </Group>
                        <Progress value={mappingProgress} w="100%" h={10} radius="xl" animated color="indigo" />
                    </Box>

                    <Paper withBorder p="md" radius="md" bg="indigo.0" w="100%">
                        <Group justify="center" gap="xs">
                            <RefreshCw size={14} className="spinning" />
                            <Text size="sm" fw={600} c="indigo">
                                Optimized Response in {Math.max(1, 10 - Math.floor(mappingProgress / 10))}s...
                            </Text>
                        </Group>
                    </Paper>
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
                        <Button 
                            variant="outline" 
                            color="indigo" 
                            onClick={() => downloadFile('xlsx')} 
                            loading={isDownloading} 
                            leftSection={<FileSpreadsheet size={18} />}
                        >
                            Download as Excel (.xlsx)
                        </Button>
                        <Button 
                            color="indigo" 
                            onClick={() => downloadFile('csv')} 
                            loading={isDownloading} 
                            leftSection={<Download size={18} />}
                        >
                            Download as CSV (.utf8)
                        </Button>
                    </Group>
                </Group>

                <Alert icon={<Settings2 size={18} />} title="Smart Mapping Interface" color="indigo" variant="light" mb="xl">
                    The data below has been automatically extracted and mapped based on your uploaded files.
                </Alert>

                <Grid gutter="xl" mb="xl">
                    <Grid.Col span={{ base: 12, md: 12, lg: hasPasswordHeader ? 4 : 8 }}>
                        <Card withBorder radius="md" padding="lg" shadow="sm" h="100%">
                            <Title order={4} mb="md">Mapping Configuration</Title>
                            <Text size="xs" c="dimmed" mb="xl">Map your source document columns to the TiPiC standard format.</Text>
                            
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                {templateHeaders.map(header => (
                                    <Paper key={header} withBorder p="md" radius="md" bg="white" style={{ borderColor: 'var(--mantine-color-gray-2)' }}>
                                        <Stack gap="xs">
                                            <Text size="xs" fw={800} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {header} *
                                            </Text>
                                            <Select
                                                placeholder="Select column"
                                                data={sourceColumns}
                                                value={mapping[header]}
                                                onChange={(val) => updateMapping(header, val)}
                                                size="md"
                                                variant="filled"
                                                radius="md"
                                                clearable
                                                searchable
                                                comboboxProps={{ shadow: 'md', radius: 'md' }}
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
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 12, lg: 4 }}>
                        <Card withBorder radius="md" padding="lg" bg="gray.0" shadow="xs" h="100%">
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
                    </Grid.Col>

                    {hasPasswordHeader && (
                        <Grid.Col span={{ base: 12, md: 12, lg: 4 }}>
                            <Card withBorder radius="md" padding="lg" style={{ borderLeft: '4px solid var(--mantine-color-teal-6)' }} shadow="sm">
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
                                        onClick={handleAutoGeneratePasswords}
                                        leftSection={<RefreshCw size={16} />}
                                        size="sm"
                                        fullWidth
                                    >
                                        Auto-Generate (Unique Password)
                                    </Button>
                                </Stack>
                            </Card>
                        </Grid.Col>
                    )}
                </Grid>

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

                <Group justify="space-between" mb="md">
                    <TextInput 
                        placeholder="Search data..." 
                        leftSection={<Search size={16} />} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.currentTarget.value)}
                        w={300}
                    />
                    <Group gap="xs">
                        {selectedRows.size > 0 && (
                            <Badge variant="light" color="indigo" size="lg">
                                {selectedRows.size} rows selected
                            </Badge>
                        )}
                        <Button 
                            variant="subtle" 
                            color="red" 
                            onClick={() => {
                                const newRows = rawRows.filter((_, i) => !selectedRows.has(i));
                                setRawRows(newRows);
                                setSelectedRows(new Set());
                            }}
                            disabled={selectedRows.size === 0}
                            leftSection={<Trash2 size={16} />}
                        >
                            Delete Selected
                        </Button>
                    </Group>
                </Group>

                <Divider label="Data Preview (Mapped Result)" labelPosition="center" mb="xl" />

                <Card shadow="sm" radius="md" withBorder padding={0}>
                    <Table.ScrollContainer minWidth={800}>
                        <Table verticalSpacing="md" highlightOnHover striped withColumnBorders>
                            <Table.Thead bg="indigo.0">
                                <Table.Tr>
                                    <Table.Th w={40}>
                                        <Checkbox 
                                            checked={selectedRows.size === rawRows.length && rawRows.length > 0} 
                                            indeterminate={selectedRows.size > 0 && selectedRows.size < rawRows.length}
                                            onChange={toggleAll}
                                        />
                                    </Table.Th>
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
                                {filteredRows.map((row, displayIdx) => {
                                    const actualIdx = rawRows.indexOf(row);
                                    return (
                                        <Table.Tr key={actualIdx} bg={selectedRows.has(actualIdx) ? 'indigo.0' : undefined}>
                                            <Table.Td>
                                                <Checkbox 
                                                    checked={selectedRows.has(actualIdx)} 
                                                    onChange={() => toggleRow(actualIdx)} 
                                                />
                                            </Table.Td>
                                            {templateHeaders.map(header => {
                                                const sourceCol = mapping[header];
                                                const value = row[sourceCol] || '';
                                                const isInRange = isDragging && dragStart?.colName === sourceCol && (
                                                    (actualIdx >= dragStart.rowIdx && actualIdx <= dragEnd) ||
                                                    (actualIdx <= dragStart.rowIdx && actualIdx >= dragEnd)
                                                );

                                                return (
                                                    <Table.Td 
                                                        key={header} 
                                                        style={{ 
                                                            padding: 0,
                                                            backgroundColor: isInRange ? 'var(--mantine-color-indigo-1)' : 'white'
                                                        }}
                                                        onMouseEnter={() => handleHoverDrag(actualIdx)}
                                                    >
                                                        <TextInput
                                                            variant="unstyled"
                                                            size="xs"
                                                            value={value}
                                                            onMouseDown={() => handleStartDrag(actualIdx, sourceCol)}
                                                            onChange={(e) => {
                                                                const newRows = [...rawRows];
                                                                newRows[actualIdx][sourceCol] = e.currentTarget.value;
                                                                setRawRows(newRows);
                                                            }}
                                                            styles={{
                                                                input: { 
                                                                    minHeight: 'unset', 
                                                                    height: 'auto', 
                                                                    padding: '8px',
                                                                    cursor: 'cell',
                                                                    backgroundColor: 'transparent',
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
                                                        onClick={() => fixRowWithAI(actualIdx)}
                                                        title="Fix with AI"
                                                    >
                                                        <Sparkles size={14} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="light" color="red" size="sm" onClick={() => {
                                                        const newRows = rawRows.filter((_, i) => i !== actualIdx);
                                                        setRawRows(newRows);
                                                        const nextSelected = new Set(selectedRows);
                                                        nextSelected.delete(actualIdx);
                                                        setSelectedRows(nextSelected);
                                                    }}>
                                                        <Trash2 size={14} />
                                                    </ActionIcon>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                                {filteredRows.length === 0 && (
                                    <Table.Tr>
                                        <Table.Td colSpan={templateHeaders.length + 2}>
                                            <Center py="xl">
                                                <Text c="dimmed">No data matching your search.</Text>
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

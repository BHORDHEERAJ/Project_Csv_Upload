import React, { useState, useEffect } from 'react';
import { Title, Text, SimpleGrid, Card, Group, Button, Progress, List, ThemeIcon, Stack, Paper, Center, Select, SegmentedControl, ActionIcon, Tooltip } from '@mantine/core';
import { Dropzone, PDF_MIME_TYPE, MS_EXCEL_MIME_TYPE, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { FileUp, FileText, Check, AlertCircle, Loader2, Download, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMapping } from '../context/MappingContext';
import * as XLSX from 'xlsx';

const CSV_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/comma-separated-values', 'application/csv'];

const PREDEFINED_TEMPLATES = [
    { label: 'ProfitSquare / NurserySeva', value: 'profitsquare_products' },
    { label: 'Empulse - Hotel', value: 'empulse_hotel' },
    { label: 'Empulse - Employee (Full-time)', value: 'empulse_employee_fulltime' },
    { label: 'Empulse - Employee (Contract-based)', value: 'empulse_employee_contract' },
];

const Upload = () => {
    const [document, setDocument] = useState(null);
    const [template, setTemplate] = useState(null);
    const [templateSource, setTemplateSource] = useState('predefined');
    const [selectedTemplateId, setSelectedTemplateId] = useState('profitsquare_products');
    
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
        const headersMap = {
            'profitsquare_products': {
                headers: ['Product Name', 'Variety', 'Barcode', 'Expiry', 'Brand', 'Category', 'Sub Category', 'HSN', 'GST', 'Buying Price', 'Selling Price', 'MRP', 'Qty'],
                data: ['Sample Product', '1 Litre', '123456789', '2025-12-31', 'BrandX', 'CategoryY', 'SubZ', '1234', '18%', '100', '150', '200', '10'],
                format: 'csv'
            },
            'empulse_hotel': {
                headers: ['First Name *', 'Middle Name', 'Surname *', 'Mobile *', 'Gender *', 'Employee ID *', 'Date of Joining *', 'Date of Birth *', 'Personal Email ID', 'Aadhaar Number *', 'PAN Card Number', 'Voter Card ID Number', 'Marital Status', 'Working Hours *', 'Payment Type *', 'Salary Amount *', 'Salary Type', 'Holiday Rate', 'Login Allowed', 'Password', 'Attendance Type', 'Tolerance', 'Double Check In', 'Multiple Check In/Out', 'No of In/Out', 'Referral Name', 'Referral Mobile Number', 'Branch Name *', 'Department Name', 'Shift Name', 'Designation Name', 'Work Module Name', 'Room Name', 'PF Enabled', 'PF Number', 'PF Auto Calculate Wage', 'PF Calc on Calendar Days', 'PF Wage Limit', 'PF Employee %', 'PF Employer %', 'ESI Enabled', 'ESI Number', 'ESI Auto Calculate Wage', 'ESI Wage Limit', 'ESI Employee %', 'ESI Employer %', 'PT Enabled', 'PT 11 Months', 'PT Feb', 'Bank Name', 'Account Number', 'IFSC Code', 'Employee Name as per Bank', 'Account Type', 'Relative Name', 'Relative Relation', 'Relative Mobile', 'Reference Name', 'Reference Relation', 'Reference Mobile', 'Last Company Name', 'Previous Experience', 'Joining Salary', 'Travelling Allowance', 'Reporting Manager', 'Worked in FML', 'FML Outlet Name', 'FML Old Designation', 'FML Working Date', 'Father Mobile Number', 'Current Address', 'Home Town Address', 'Interviewed By', 'Uniform - T-Shirt Size', 'Uniform - Pant Size', 'Uniform - Apron', 'Uniform - Cap/Bandana', 'Is Not Indian Citizen', 'Country Name', 'Document Type Name', 'Document Number', 'Last Working Day'],
                data: ['John', 'A.', 'Doe', '9876543210', 'Male', 'H001', '2024-01-01', '1990-01-01', 'john@example.com', '123456789012', 'ABCDE1234F', 'VOTER123', 'Married', '8', 'Monthly', '25000', 'Fixed', '500', 'Yes', 'P@ss123', 'Biometric', '15', 'No', 'Yes', '2', 'Referrer X', '9998887776', 'Main Branch', 'F&B', 'Morning', 'Waiter', 'Module A', 'Room 101', 'Yes', 'PF12345', 'Yes', 'Yes', '15000', '12', '13', 'Yes', 'ESI123', 'Yes', '21000', '0.75', '3.25', 'Yes', 'Yes', 'Yes', 'Sample Bank', '1234567890', 'SBIN0001234', 'John Doe', 'Savings', 'Jane Doe', 'Wife', '9876543211', 'Ref Person', 'Friend', '9888777666', 'Old Corp', '2 Years', '20000', '100', 'Manager Y', 'No', 'N/A', 'N/A', 'N/A', '9876543212', 'Line 1, City', 'Hometown, State', 'Interviewer Z', 'L', '34', 'Yes', 'Yes', 'No', 'India', 'Passport', 'P1234567', 'N/A'],
                format: 'xlsx'
            },
            'empulse_employee_fulltime': {
                headers: ['Name *', 'Mobile *', 'Gender *', 'Employee ID *', 'Date of Joining *', 'Working Hours *', 'Payment Type *', 'Salary Amount *', 'Login Allowed', 'Password', 'Attendance Type', 'Tolerance', 'Double Check In', 'Multiple Check In/Out', 'No of In/Out', 'Date of Birth', 'Email', 'Aadhaar Number', 'Referral Name', 'Referral Mobile Number', 'Branch Name', 'Department Name', 'Shift Name', 'Designation Name', 'Salary Type', 'Is Hourly Paid', 'Overtime Type', 'Wage Overtime', 'Holiday Rate', 'PF Enabled', 'PF Auto Calculate Wage', 'PF Calc on Calendar Days', 'PF Number', 'PF Wage Limit', 'PF Employee %', 'PF Employer %', 'ESI Enabled', 'ESI Auto Calculate Wage', 'ESI Number', 'ESI Wage Limit', 'ESI Employee %', 'ESI Employer %', 'PT Enabled', 'PT 11 Months', 'PT Feb', 'Bank Name', 'Account Number', 'IFSC Code'],
                data: ['Jane Doe', '9123456789', 'Female', 'F101', '2024-02-01', '9', 'Monthly', '30000', 'Yes', 'Secure123', 'Manual', '30', 'No', 'Yes', '4', '1995-05-15', 'jane@example.com', '987654321098', 'Referrer B', '9888777665', 'Corporate', 'HR', 'General', 'Manager', 'Monthly', 'No', 'Fixed', '200', '1000', 'Yes', 'Yes', 'No', 'PF5566', '15000', '12', '13', 'Yes', 'Yes', 'ESI7788', '21000', '0.75', '3.25', 'Yes', 'No', 'Yes', 'Global Bank', '987654321', 'GIBL001'],
                format: 'xlsx'
            },
            'empulse_employee_contract': {
                headers: ['Name *', 'Mobile *', 'Gender *', 'Employee ID *', 'Date of Joining *', 'Working Hours *', 'Contract Type *', 'Daily Salary *', 'Date of Birth', 'Aadhaar Number', 'Referral Name', 'Referral Mobile Number', 'Branch Name', 'Department Name', 'Shift Name', 'Designation Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Employee Name as per Bank', 'Account Type'],
                data: ['Sam Smith', '9988776655', 'Male', 'C501', '2024-03-01', '10', 'Daily', '800', '1988-10-10', '556677889900', 'Referrer C', '9111222333', 'Warehouse', 'Logistics', 'Night', 'Picker', 'Local Bank', '554433221', 'LOCL002', 'Sam Smith', 'Current'],
                format: 'xlsx'
            }
        };

        const config = headersMap[selectedTemplateId];
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
        if (!document) return;
        if (templateSource === 'custom' && !template) return;

        setIsProcessing(true);
        setStatus('Uploading documents to TiPiC Engine...');
        setProgress(10);
        
        try {
            const formData = new FormData();
            formData.append('document', document);
            
            if (templateSource === 'predefined') {
                formData.append('template_id', selectedTemplateId);
            } else if (template) {
                formData.append('template', template);
            }

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
                <Text c="dimmed">Upload your source file and select a target template to begin automated mapping.</Text>
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
                        <Group justify="center" gap="xl" mih={240} style={{ pointerEvents: 'none' }}>
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
                                <Text size="sm" truncate>{document.name}</Text>
                            </Group>
                        </Paper>
                    )}
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

                    <Paper withBorder p="md" radius="md" mih={240}>
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
                {document && (templateSource === 'predefined' || template) && !isProcessing && progress === 0 && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Center mt="xl">
                            <Button size="xl" color="indigo" leftSection={<Loader2 size={20} />} onClick={handleProcess}>
                                Start Processing
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
        </Stack>
    );
};

export default Upload;

import React, { useState } from 'react';
import { Title, Text, Card, Group, Button, TextInput, Select, Stack, Paper, ActionIcon, Table, Badge, Accordion, ThemeIcon } from '@mantine/core';
import { Plus, Trash2, Save, Settings2, FileCode, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';

const MappingConfigUI = () => {
    const [rules, setRules] = useState([
        { id: '1', sourceField: 'Item Description', targetField: 'ProductName', transformation: 'None' },
        { id: '2', sourceField: 'Marathi Name', targetField: 'MarathiDescription', transformation: 'OCR Correction' },
        { id: '3', sourceField: 'Unit Price', targetField: 'Price', transformation: 'Remove Currency Symbols' },
    ]);

    const addRule = () => {
        const newRule = {
            id: Date.now().toString(),
            sourceField: '',
            targetField: '',
            transformation: 'None'
        };
        setRules([...rules, newRule]);
    };

    const removeRule = (id) => {
        setRules(rules.filter(rule => rule.id !== id));
    };

    return (
        <Stack gap="xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Group justify="space-between" align="flex-end" mb="xl">
                    <div>
                        <Title order={2}>Mapping Configuration</Title>
                        <Text c="dimmed">Define how source document fields map to the TiPiC WMS CSV template.</Text>
                    </div>
                    <Button variant="filled" color="indigo" leftSection={<Save size={18} />}>
                        Save Configuration
                    </Button>
                </Group>

                <Accordion variant="separated" radius="md">
                    <Accordion.Item value="general">
                        <Accordion.Control icon={<Settings2 size={20} color="var(--mantine-color-indigo-6)" />}>
                            General Mapping Info
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="md">
                                <TextInput label="Configuration Name" placeholder="e.g., Vendor A Price List" />
                                <Select 
                                    label="Document Type" 
                                    placeholder="Select type" 
                                    data={['Invoice', 'Price List', 'Quotation', 'Work Order']} 
                                />
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="rules">
                        <Accordion.Control icon={<FileCode size={20} color="var(--mantine-color-teal-6)" />}>
                            Field Mapping Rules
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Table verticalSpacing="md" withColumnBorders>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Source Field (Raw)</Table.Th>
                                        <Table.Th>Target Field (CSV)</Table.Th>
                                        <Table.Th>Transformation</Table.Th>
                                        <Table.Th>Actions</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {rules.map((rule) => (
                                        <Table.Tr key={rule.id}>
                                            <Table.Td>
                                                <TextInput 
                                                    placeholder="e.g. Item_Desc"
                                                    value={rule.sourceField}
                                                    onChange={(e) => {
                                                        const newRules = [...rules];
                                                        newRules.find(r => r.id === rule.id).sourceField = e.target.value;
                                                        setRules(newRules);
                                                    }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Select
                                                    data={['ProductName', 'Price', 'SKU', 'MarathiDescription', 'Stock']}
                                                    value={rule.targetField}
                                                    onChange={(val) => {
                                                        const newRules = [...rules];
                                                        newRules.find(r => r.id === rule.id).targetField = val;
                                                        setRules(newRules);
                                                    }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Select
                                                    data={['None', 'OCR Correction', 'Remove Currency Symbols', 'Trim Whitespace']}
                                                    value={rule.transformation}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <ActionIcon color="red" variant="subtle" onClick={() => removeRule(rule.id)}>
                                                    <Trash2 size={16} />
                                                </ActionIcon>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                            <Button variant="light" color="indigo" mt="md" leftSection={<Plus size={18} />} onClick={addRule}>
                                Add New Rule
                            </Button>
                        </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="auto">
                        <Accordion.Control icon={<Wand2 size={20} color="var(--mantine-color-orange-6)" />}>
                            Smart AI Auto-Mapping
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Text size="sm" mb="md">Enable AI to automatically detect and map headers based on content patterns.</Text>
                            <Button variant="outline" color="orange">Run Auto-Detection</Button>
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
            </motion.div>
        </Stack>
    );
};

export default MappingConfigUI;

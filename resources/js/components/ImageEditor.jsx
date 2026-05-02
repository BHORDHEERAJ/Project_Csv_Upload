import React, { useState, useCallback } from 'react';
import { Modal, Button, Group, Slider, Text, Stack, ActionIcon } from '@mantine/core';
import Cropper from 'react-easy-crop';
import { RotateCw, ZoomIn, Check, X } from 'lucide-react';

const ImageEditor = ({ opened, onClose, image, onSave }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const rotRad = (rotation * Math.PI) / 180;
        const { width: bWidth, height: bHeight } = {
            width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
            height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
        };

        canvas.width = bWidth;
        canvas.height = bHeight;

        ctx.translate(bWidth / 2, bHeight / 2);
        ctx.rotate(rotRad);
        ctx.translate(-image.width / 2, -image.height / 2);
        ctx.drawImage(image, 0, 0);

        const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        ctx.putImageData(data, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((file) => {
                resolve(file);
            }, 'image/jpeg');
        });
    };

    const handleSave = async () => {
        try {
            const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels, rotation);
            onSave(croppedImageBlob);
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Edit Image" size="xl" centered>
            <Stack h={500}>
                <div style={{ position: 'relative', flex: 1, background: '#333' }}>
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={undefined}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                    />
                </div>
                
                <Stack gap="xs">
                    <Group grow>
                        <Stack gap={0}>
                            <Text size="xs" fw={500}>Zoom</Text>
                            <Slider 
                                value={zoom} 
                                min={1} max={3} step={0.1} 
                                onChange={setZoom} 
                                label={(value) => `${value.toFixed(1)}x`}
                            />
                        </Stack>
                        <Stack gap={0}>
                            <Text size="xs" fw={500}>Rotate</Text>
                            <Slider 
                                value={rotation} 
                                min={0} max={360} step={1} 
                                onChange={setRotation}
                                label={(value) => `${value}°`}
                            />
                        </Stack>
                    </Group>

                    <Group justify="flex-end" mt="md">
                        <Button variant="light" color="gray" leftSection={<X size={16} />} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button color="indigo" leftSection={<Check size={16} />} onClick={handleSave}>
                            Apply Changes
                        </Button>
                    </Group>
                </Stack>
            </Stack>
        </Modal>
    );
};

export default ImageEditor;

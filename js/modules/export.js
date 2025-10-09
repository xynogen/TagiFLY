// TagiFLY Export System Module
// JSON, YOLO, COCO, Pascal VOC export işlemleri

import { NotificationManager } from './notification.js';
const { ipcRenderer } = require('electron');

// JSZip'i global olarak yükle
let JSZip = null;

// JSZip'i yükle
const loadJSZip = async () => {
    if (!JSZip) {
        try {
            // Electron'da require daha güvenilir
            JSZip = require('jszip');
            console.log('✅ JSZip yüklendi');
        } catch (error) {
            console.error('❌ JSZip yükleme hatası:', error);
            throw new Error('JSZip kütüphanesi yüklenemedi. Lütfen uygulamayı yeniden başlatın.');
        }
    }
    return JSZip;
};

export class ExportManager {
    constructor(app) {
        this.app = app;
    }

    // ========== EXPORT MODAL ==========
    openExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.classList.add('show');
            console.log('📤 Export modal opened');
        }
    }

    closeExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.classList.remove('show');
            console.log('❌ Export modal closed');
        }
    }

    // ========== EXPORT ANNOTATIONS ==========
    async exportAnnotations(format) {
        console.log(`📤 Exporting annotations in ${format} format`);

        // Validate that we have annotations to export
        if (!this.app.annotations || Object.keys(this.app.annotations).length === 0) {
            NotificationManager.error('No annotations to export. Please create some annotations first.');
            return;
        }

        try {
            let exportData;
            let fileName;
            let fileExtension;

            switch (format) {
                case 'json':
                    exportData = this.exportToJSON();
                    fileName = 'tagifly_annotations.json';
                    fileExtension = 'json';
                    break;
                case 'yolo':
                    const yoloZip = await this.exportToYOLO();
                    exportData = yoloZip.buffer;
                    fileName = 'yolo_dataset.zip';
                    fileExtension = 'zip';
                    break;
                case 'coco':
                    exportData = this.exportToCOCO();
                    fileName = 'coco_annotations.json';
                    fileExtension = 'json';
                    break;
                case 'pascal':
                    const pascalZip = await this.exportToPascalVOC();
                    exportData = pascalZip.buffer;
                    fileName = 'pascal_voc_dataset.zip';
                    fileExtension = 'zip';
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            // Save file using Electron
            const result = await ipcRenderer.invoke('save-file', exportData, fileName, fileExtension);

            if (result.success) {
                NotificationManager.success(`${format.toUpperCase()} annotations exported successfully!`);
                this.closeExportModal();
                console.log(`✅ Export completed: ${result.path}`);
            } else if (result.canceled) {
                NotificationManager.info('Export canceled');
            } else {
                throw new Error(result.error || 'Unknown error');
            }

        } catch (error) {
            console.error('❌ Export error:', error);
            NotificationManager.error(`Export failed: ${error.message}`);
        }
    }

    // ========== JSON EXPORT ==========
    exportToJSON() {
        const exportData = {
            version: '2.0.0',
            created: new Date().toISOString(),
            tool: 'TagiFLY v2.0.0',
            images: this.app.images.map(img => ({
                path: img.path,
                name: img.name,
                url: img.url,
                width: img.originalWidth || 0,
                height: img.originalHeight || 0
            })),
            labels: this.app.labels,
            labelColors: this.app.labelColors,
            annotations: this.app.annotations,
            annotationTypes: {
                boundingbox: 'Rectangle annotations',
                polygon: 'Polygon annotations', 
                point: 'Point annotations',
                keypoint: 'Keypoint annotations',
                pose: 'Pose annotations (17 keypoints)',
                polyline: 'Polyline annotations',
                maskpaint: 'Mask paint annotations'
            }
        };

        return JSON.stringify(exportData, null, 2);
    }

    // ========== YOLO EXPORT ==========
    async exportToYOLO() {
        const JSZipClass = await loadJSZip();
        const zip = new JSZipClass();

        // Create classes.txt
        const classesContent = this.app.labels.join('\n');
        zip.file('classes.txt', classesContent);

        // Create annotation files for each image
        for (const image of this.app.images) {
            const imagePath = image.path;
            const annotations = this.app.annotations[imagePath] || [];
            
            if (annotations.length > 0) {
                const fileName = image.name.replace(/\.[^/.]+$/, '.txt');
                // Get image dimensions from the image object
                const imageWidth = image.originalWidth || 0;
                const imageHeight = image.originalHeight || 0;
                const yoloContent = this.convertToYOLOFormat(annotations, imageWidth, imageHeight);
                zip.file(fileName, yoloContent);
            }
        }

        return await zip.generateAsync({ type: 'uint8array' });
    }

    convertToYOLOFormat(annotations, imageWidth, imageHeight) {
        return annotations.map(annotation => {
            const labelIndex = this.app.labels.indexOf(annotation.label);
            if (labelIndex === -1) return '';
            
            switch (annotation.type) {
                case 'boundingbox':
                    const centerX = (annotation.x + annotation.width / 2) / imageWidth;
                    const centerY = (annotation.y + annotation.height / 2) / imageHeight;
                    const width = annotation.width / imageWidth;
                    const height = annotation.height / imageHeight;
                    return `${labelIndex} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`;
                
                case 'point':
                    const pointX = annotation.x / imageWidth;
                    const pointY = annotation.y / imageHeight;
                    // Point as very small bounding box (0.01 x 0.01)
                    return `${labelIndex} ${pointX.toFixed(6)} ${pointY.toFixed(6)} 0.01 0.01`;
                
                case 'keypoint':
                    const keypointX = annotation.x / imageWidth;
                    const keypointY = annotation.y / imageHeight;
                    // Keypoint as very small bounding box (0.01 x 0.01)
                    return `${labelIndex} ${keypointX.toFixed(6)} ${keypointY.toFixed(6)} 0.01 0.01`;
                
                case 'polygon':
                    // Convert polygon to bounding box
                    if (annotation.points && annotation.points.length >= 3) {
                        const xs = annotation.points.map(p => p.x);
                        const ys = annotation.points.map(p => p.y);
                        const minX = Math.min(...xs);
                        const maxX = Math.max(...xs);
                        const minY = Math.min(...ys);
                        const maxY = Math.max(...ys);
                        
                        const centerX = (minX + maxX) / 2 / imageWidth;
                        const centerY = (minY + maxY) / 2 / imageHeight;
                        const width = (maxX - minX) / imageWidth;
                        const height = (maxY - minY) / imageHeight;
                        
                        return `${labelIndex} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`;
                    }
                    return '';
                
                case 'pose':
                    // Convert pose to bounding box around all keypoints
                    if (annotation.keypoints && annotation.keypoints.length > 0) {
                        const xs = annotation.keypoints.map(kp => kp.x);
                        const ys = annotation.keypoints.map(kp => kp.y);
                        const minX = Math.min(...xs);
                        const maxX = Math.max(...xs);
                        const minY = Math.min(...ys);
                        const maxY = Math.max(...ys);
                        
                        const centerX = (minX + maxX) / 2 / imageWidth;
                        const centerY = (minY + maxY) / 2 / imageHeight;
                        const width = (maxX - minX) / imageWidth;
                        const height = (maxY - minY) / imageHeight;
                        
                        return `${labelIndex} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`;
                    }
                    return '';
                
                case 'polyline':
                    // Convert polyline to bounding box
                    if (annotation.points && annotation.points.length >= 2) {
                        const xs = annotation.points.map(p => p.x);
                        const ys = annotation.points.map(p => p.y);
                        const minX = Math.min(...xs);
                        const maxX = Math.max(...xs);
                        const minY = Math.min(...ys);
                        const maxY = Math.max(...ys);
                        
                        const centerX = (minX + maxX) / 2 / imageWidth;
                        const centerY = (minY + maxY) / 2 / imageHeight;
                        const width = (maxX - minX) / imageWidth;
                        const height = (maxY - minY) / imageHeight;
                        
                        return `${labelIndex} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`;
                    }
                    return '';
                
                case 'maskpaint':
                    // Convert mask paint to bounding box
                    if (annotation.points && annotation.points.length >= 2) {
                        const xs = annotation.points.map(p => p.x);
                        const ys = annotation.points.map(p => p.y);
                        const minX = Math.min(...xs);
                        const maxX = Math.max(...xs);
                        const minY = Math.min(...ys);
                        const maxY = Math.max(...ys);
                        
                        const centerX = (minX + maxX) / 2 / imageWidth;
                        const centerY = (minY + maxY) / 2 / imageHeight;
                        const width = (maxX - minX) / imageWidth;
                        const height = (maxY - minY) / imageHeight;
                        
                        return `${labelIndex} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`;
                    }
                    return '';
                
                default:
                    return '';
            }
        }).filter(line => line !== '').join('\n');
    }

    // ========== COCO EXPORT ==========
    exportToCOCO() {
        const cocoData = {
            info: {
                description: 'TagiFLY v2.0.0 Export',
                version: '2.0.0',
                year: new Date().getFullYear(),
                contributor: 'TagiFLY',
                date_created: new Date().toISOString()
            },
            licenses: [{
                id: 1,
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }],
            images: [],
            annotations: [],
            categories: []
        };

        // Add categories
        this.app.labels.forEach((label, index) => {
            cocoData.categories.push({
                id: index + 1,
                name: label,
                supercategory: 'object'
            });
        });

        // Add images and annotations
        let annotationId = 1;
        this.app.images.forEach((image, imageIndex) => {
            const imagePath = image.path;
            const annotations = this.app.annotations[imagePath] || [];

            // Get image dimensions from the image object
            const imageWidth = image.originalWidth || 0;
            const imageHeight = image.originalHeight || 0;
            
            // Add image info
            cocoData.images.push({
                id: imageIndex + 1,
                width: imageWidth,
                height: imageHeight,
                file_name: image.name,
                license: 1,
                date_captured: new Date().toISOString()
            });

            // Add annotations - support all annotation types
            annotations.forEach(annotation => {
                const categoryId = this.app.labels.indexOf(annotation.label) + 1;
                if (categoryId === 0) return; // Skip if label not found
                
                let bbox, area, segmentation = null;
                
                switch (annotation.type) {
                    case 'boundingbox':
                        bbox = [annotation.x, annotation.y, annotation.width, annotation.height];
                        area = annotation.width * annotation.height;
                        break;
                    
                    case 'point':
                        // Point as very small bounding box
                        bbox = [annotation.x, annotation.y, 1, 1];
                        area = 1;
                        break;
                    
                    case 'keypoint':
                        // Keypoint as very small bounding box
                        bbox = [annotation.x, annotation.y, 1, 1];
                        area = 1;
                        break;
                    
                    case 'polygon':
                        if (annotation.points && annotation.points.length >= 3) {
                            // Convert polygon to bounding box
                            const xs = annotation.points.map(p => p.x);
                            const ys = annotation.points.map(p => p.y);
                            const minX = Math.min(...xs);
                            const maxX = Math.max(...xs);
                            const minY = Math.min(...ys);
                            const maxY = Math.max(...ys);
                            
                            bbox = [minX, minY, maxX - minX, maxY - minY];
                            area = (maxX - minX) * (maxY - minY);
                            
                            // Add segmentation data
                            const polygonPoints = annotation.points.flatMap(p => [p.x, p.y]);
                            segmentation = [polygonPoints];
                        } else {
                            return; // Skip invalid polygon
                        }
                        break;
                    
                    case 'pose':
                        if (annotation.keypoints && annotation.keypoints.length > 0) {
                            // Convert pose to bounding box around all keypoints
                            const xs = annotation.keypoints.map(kp => kp.x);
                            const ys = annotation.keypoints.map(kp => kp.y);
                            const minX = Math.min(...xs);
                            const maxX = Math.max(...xs);
                            const minY = Math.min(...ys);
                            const maxY = Math.max(...ys);
                            
                            bbox = [minX, minY, maxX - minX, maxY - minY];
                            area = (maxX - minX) * (maxY - minY);
                        } else {
                            return; // Skip invalid pose
                        }
                        break;
                    
                    case 'polyline':
                        if (annotation.points && annotation.points.length >= 2) {
                            // Convert polyline to bounding box
                            const xs = annotation.points.map(p => p.x);
                            const ys = annotation.points.map(p => p.y);
                            const minX = Math.min(...xs);
                            const maxX = Math.max(...xs);
                            const minY = Math.min(...ys);
                            const maxY = Math.max(...ys);
                            
                            bbox = [minX, minY, maxX - minX, maxY - minY];
                            area = (maxX - minX) * (maxY - minY);
                        } else {
                            return; // Skip invalid polyline
                        }
                        break;
                    
                    case 'maskpaint':
                        if (annotation.points && annotation.points.length >= 2) {
                            // Convert mask paint to bounding box
                            const xs = annotation.points.map(p => p.x);
                            const ys = annotation.points.map(p => p.y);
                            const minX = Math.min(...xs);
                            const maxX = Math.max(...xs);
                            const minY = Math.min(...ys);
                            const maxY = Math.max(...ys);
                            
                            bbox = [minX, minY, maxX - minX, maxY - minY];
                            area = (maxX - minX) * (maxY - minY);
                        } else {
                            return; // Skip invalid mask paint
                        }
                        break;
                    
                    default:
                        return; // Skip unsupported types
                }
                
                if (bbox && area > 0) {
                    const annotationData = {
                        id: annotationId++,
                        image_id: imageIndex + 1,
                        category_id: categoryId,
                        bbox: bbox,
                        area: area,
                        iscrowd: 0
                    };
                    
                    if (segmentation) {
                        annotationData.segmentation = segmentation;
                    }
                    
                    cocoData.annotations.push(annotationData);
                }
            });
        });

        return JSON.stringify(cocoData, null, 2);
    }

    // ========== PASCAL VOC EXPORT ==========
    async exportToPascalVOC() {
        const JSZipClass = await loadJSZip();
        const zip = new JSZipClass();

        // Create annotation files for each image
        for (const image of this.app.images) {
            const imagePath = image.path;
            const annotations = this.app.annotations[imagePath] || [];
            
            if (annotations.length > 0) {
                const fileName = image.name.replace(/\.[^/.]+$/, '.xml');
                const xmlContent = this.convertToPascalVOCFormat(image, annotations);
                zip.file(fileName, xmlContent);
            }
        }

        return await zip.generateAsync({ type: 'uint8array' });
    }

    convertToPascalVOCFormat(image, annotations) {
        // Get image dimensions from the image object
        const width = image.originalWidth || 0;
        const height = image.originalHeight || 0;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
    <folder>images</folder>
    <filename>${image.name}</filename>
    <path>${image.path}</path>
    <source>
        <database>TagiFLY</database>
    </source>
    <size>
        <width>${width}</width>
        <height>${height}</height>
        <depth>3</depth>
    </size>
    <segmented>0</segmented>`;

        annotations.forEach(annotation => {
            let xmin, ymin, xmax, ymax;
            
            switch (annotation.type) {
                case 'boundingbox':
                    xmin = Math.round(annotation.x);
                    ymin = Math.round(annotation.y);
                    xmax = Math.round(annotation.x + annotation.width);
                    ymax = Math.round(annotation.y + annotation.height);
                    break;
                
                case 'point':
                    // Point as very small bounding box
                    xmin = Math.round(annotation.x);
                    ymin = Math.round(annotation.y);
                    xmax = Math.round(annotation.x + 1);
                    ymax = Math.round(annotation.y + 1);
                    break;
                
                case 'keypoint':
                    // Keypoint as very small bounding box
                    xmin = Math.round(annotation.x);
                    ymin = Math.round(annotation.y);
                    xmax = Math.round(annotation.x + 1);
                    ymax = Math.round(annotation.y + 1);
                    break;
                
                case 'polygon':
                    if (annotation.points && annotation.points.length >= 3) {
                        const xs = annotation.points.map(p => p.x);
                        const ys = annotation.points.map(p => p.y);
                        xmin = Math.round(Math.min(...xs));
                        ymin = Math.round(Math.min(...ys));
                        xmax = Math.round(Math.max(...xs));
                        ymax = Math.round(Math.max(...ys));
                    } else {
                        return; // Skip invalid polygon
                    }
                    break;
                
                case 'pose':
                    if (annotation.keypoints && annotation.keypoints.length > 0) {
                        const xs = annotation.keypoints.map(kp => kp.x);
                        const ys = annotation.keypoints.map(kp => kp.y);
                        xmin = Math.round(Math.min(...xs));
                        ymin = Math.round(Math.min(...ys));
                        xmax = Math.round(Math.max(...xs));
                        ymax = Math.round(Math.max(...ys));
                    } else {
                        return; // Skip invalid pose
                    }
                    break;
                
                case 'polyline':
                    if (annotation.points && annotation.points.length >= 2) {
                        const xs = annotation.points.map(p => p.x);
                        const ys = annotation.points.map(p => p.y);
                        xmin = Math.round(Math.min(...xs));
                        ymin = Math.round(Math.min(...ys));
                        xmax = Math.round(Math.max(...xs));
                        ymax = Math.round(Math.max(...ys));
                    } else {
                        return; // Skip invalid polyline
                    }
                    break;
                
                case 'maskpaint':
                    if (annotation.points && annotation.points.length >= 2) {
                        const xs = annotation.points.map(p => p.x);
                        const ys = annotation.points.map(p => p.y);
                        xmin = Math.round(Math.min(...xs));
                        ymin = Math.round(Math.min(...ys));
                        xmax = Math.round(Math.max(...xs));
                        ymax = Math.round(Math.max(...ys));
                    } else {
                        return; // Skip invalid mask paint
                    }
                    break;
                
                default:
                    return; // Skip unsupported types
            }
            
            // Add object to XML
            xml += `
    <object>
        <name>${annotation.label}</name>
        <pose>Unspecified</pose>
        <truncated>0</truncated>
        <difficult>0</difficult>
        <bndbox>
            <xmin>${xmin}</xmin>
            <ymin>${ymin}</ymin>
            <xmax>${xmax}</xmax>
            <ymax>${ymax}</ymax>
        </bndbox>
    </object>`;
        });

        xml += `
</annotation>`;

        return xml;
    }
}

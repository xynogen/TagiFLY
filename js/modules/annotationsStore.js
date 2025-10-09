// TagiFLY Professional Annotations Store
// CRUD for annotation objects, emits change events. Supports transactional batch operations.

const { v4: uuidv4 } = require('uuid');

export class AnnotationsStore {
    constructor() {
        this.annotations = new Map();
        this.listeners = new Set();
        this.currentImagePath = null;
        this.batchOperations = [];
        this.isBatching = false;
    }
    
    // ========== EVENT SYSTEM ==========
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    
    emit(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in annotation store listener:', error);
            }
        });
    }
    
    // ========== IMAGE MANAGEMENT ==========
    setCurrentImage(imagePath) {
        this.currentImagePath = imagePath;
        if (!this.annotations.has(imagePath)) {
            this.annotations.set(imagePath, []);
        }
    }
    
    getCurrentImageAnnotations() {
        if (!this.currentImagePath) return [];
        return this.annotations.get(this.currentImagePath) || [];
    }
    
    // ========== CRUD OPERATIONS ==========
    create(annotationData) {
        if (!this.currentImagePath) {
            throw new Error('No current image set');
        }
        
        const annotation = {
            id: uuidv4(),
            type: annotationData.type,
            points: annotationData.points || [],
            meta: {
                label: annotationData.label || 'unlabeled',
                tags: annotationData.tags || [],
                confidence: annotationData.confidence || null,
                createdBy: 'user',
                createdAt: new Date().toISOString(),
                locked: false,
                visible: true,
                zIndex: 0,
                ...annotationData.meta
            },
            style: {
                strokeWidth: 2,
                strokeDash: 'solid',
                strokeColor: '#007AFF',
                fillColor: null,
                handleSize: 8,
                ...annotationData.style
            },
            ...annotationData
        };
        
        // Add to store
        const imageAnnotations = this.annotations.get(this.currentImagePath) || [];
        imageAnnotations.push(annotation);
        this.annotations.set(this.currentImagePath, imageAnnotations);
        
        // Emit event
        this.emit({
            type: 'annotationCreated',
            annotation: annotation,
            imagePath: this.currentImagePath
        });
        
        return annotation;
    }
    
    read(id) {
        if (!this.currentImagePath) return null;
        
        const imageAnnotations = this.annotations.get(this.currentImagePath) || [];
        return imageAnnotations.find(ann => ann.id === id) || null;
    }
    
    update(id, updates) {
        if (!this.currentImagePath) return null;
        
        const imageAnnotations = this.annotations.get(this.currentImagePath) || [];
        const index = imageAnnotations.findIndex(ann => ann.id === id);
        
        if (index === -1) return null;
        
        const oldAnnotation = { ...imageAnnotations[index] };
        imageAnnotations[index] = { ...oldAnnotation, ...updates };
        this.annotations.set(this.currentImagePath, imageAnnotations);
        
        // Emit event
        this.emit({
            type: 'annotationUpdated',
            annotation: imageAnnotations[index],
            oldAnnotation: oldAnnotation,
            imagePath: this.currentImagePath
        });
        
        return imageAnnotations[index];
    }
    
    delete(id) {
        if (!this.currentImagePath) return false;
        
        const imageAnnotations = this.annotations.get(this.currentImagePath) || [];
        const index = imageAnnotations.findIndex(ann => ann.id === id);
        
        if (index === -1) return false;
        
        const deletedAnnotation = imageAnnotations[index];
        imageAnnotations.splice(index, 1);
        this.annotations.set(this.currentImagePath, imageAnnotations);
        
        // Emit event
        this.emit({
            type: 'annotationDeleted',
            annotation: deletedAnnotation,
            imagePath: this.currentImagePath
        });
        
        return true;
    }
    
    // ========== BATCH OPERATIONS ==========
    startBatch() {
        this.isBatching = true;
        this.batchOperations = [];
    }
    
    endBatch() {
        this.isBatching = false;
        
        if (this.batchOperations.length > 0) {
            this.emit({
                type: 'batchOperation',
                operations: this.batchOperations
            });
        }
        
        this.batchOperations = [];
    }
    
    batchCreate(annotationData) {
        if (!this.isBatching) {
            return this.create(annotationData);
        }
        
        const annotation = this.create(annotationData);
        this.batchOperations.push({
            type: 'create',
            annotation: annotation
        });
        
        return annotation;
    }
    
    batchUpdate(id, updates) {
        if (!this.isBatching) {
            return this.update(id, updates);
        }
        
        const result = this.update(id, updates);
        if (result) {
            this.batchOperations.push({
                type: 'update',
                id: id,
                updates: updates
            });
        }
        
        return result;
    }
    
    batchDelete(id) {
        if (!this.isBatching) {
            return this.delete(id);
        }
        
        const result = this.delete(id);
        if (result) {
            this.batchOperations.push({
                type: 'delete',
                id: id
            });
        }
        
        return result;
    }
    
    // ========== QUERY OPERATIONS ==========
    findByType(type) {
        const imageAnnotations = this.getCurrentImageAnnotations();
        return imageAnnotations.filter(ann => ann.type === type);
    }
    
    findByLabel(label) {
        const imageAnnotations = this.getCurrentImageAnnotations();
        return imageAnnotations.filter(ann => ann.meta.label === label);
    }
    
    findSelected() {
        const imageAnnotations = this.getCurrentImageAnnotations();
        return imageAnnotations.filter(ann => ann.selected);
    }
    
    findVisible() {
        const imageAnnotations = this.getCurrentImageAnnotations();
        return imageAnnotations.filter(ann => ann.meta.visible);
    }
    
    // ========== SELECTION MANAGEMENT ==========
    select(id) {
        // Deselect all first
        this.deselectAll();
        
        // Select the specified annotation
        const annotation = this.update(id, { selected: true });
        return annotation;
    }
    
    selectMultiple(ids) {
        // Deselect all first
        this.deselectAll();
        
        // Select multiple annotations
        const selectedAnnotations = [];
        ids.forEach(id => {
            const annotation = this.update(id, { selected: true });
            if (annotation) {
                selectedAnnotations.push(annotation);
            }
        });
        
        return selectedAnnotations;
    }
    
    deselectAll() {
        const imageAnnotations = this.getCurrentImageAnnotations();
        imageAnnotations.forEach(ann => {
            if (ann.selected) {
                this.update(ann.id, { selected: false });
            }
        });
    }
    
    // ========== UTILITY METHODS ==========
    getCount() {
        return this.getCurrentImageAnnotations().length;
    }
    
    getCountByType(type) {
        return this.findByType(type).length;
    }
    
    getCountByLabel(label) {
        return this.findByLabel(label).length;
    }
    
    clear() {
        if (!this.currentImagePath) return;
        
        const imageAnnotations = this.annotations.get(this.currentImagePath) || [];
        this.annotations.set(this.currentImagePath, []);
        
        // Emit event
        this.emit({
            type: 'annotationsCleared',
            imagePath: this.currentImagePath,
            clearedCount: imageAnnotations.length
        });
    }
    
    // ========== EXPORT/IMPORT ==========
    exportAnnotations() {
        const result = {};
        this.annotations.forEach((annotations, imagePath) => {
            result[imagePath] = annotations;
        });
        return result;
    }
    
    importAnnotations(annotationsData) {
        Object.entries(annotationsData).forEach(([imagePath, annotations]) => {
            this.annotations.set(imagePath, annotations);
        });
        
        // Emit event
        this.emit({
            type: 'annotationsImported',
            importedCount: Object.keys(annotationsData).length
        });
    }
}

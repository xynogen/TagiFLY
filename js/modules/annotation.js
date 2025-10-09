// TagiFLY Annotation Tools Module
// Tüm annotation araçları: BoundingBox, Polygon, Point, Keypoint, Mask, Polyline

import { CONFIG } from './config.js';
import { NotificationManager } from './notification.js';

export class AnnotationManager {
    constructor(app) {
        this.app = app;
        
        // Canvas references (will be set by main app)
        this.canvas = null;
        this.ctx = null;
        
        // Annotation System
        this.currentTool = 'boundingbox';
        this.isDrawing = false;
        this.currentBbox = null;

        // Polygon System
        this.polygonPoints = [];
        this.isPolygonDrawing = false;

        // Keypoint System
        this.keypointSets = {}; // Store keypoint sets by label
        this.currentKeypointSet = null;
        this.isKeypointMode = false;

        // Mask Paint System
        this.isMaskPainting = false;
        this.maskCanvas = null;
        this.maskCtx = null;
        this.maskBrushSize = CONFIG.MASK.DEFAULT_BRUSH_SIZE;
        this.maskMode = 'paint'; // 'paint' or 'erase'
        this.currentMaskAnnotation = null;

        // Polyline System
        this.polylinePoints = [];
        this.isPolylineDrawing = false;

        // Editing System
        this.selectedAnnotation = null;
        this.selectedAnnotationIndex = -1;
        this.hoveredAnnotation = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.resizeHandle = null;
        this.dragReady = false;
        this.dragStartPos = null;

        // Keypoint Preview System
        this.keypointPreviewMode = false;
        this.currentKeypointGuide = null;
    }
    
    // ========== EVENT LISTENER SETUP ==========
    setupEventListeners() {
        console.log('🎯 Setting up annotation event listeners...');
        
        if (!this.canvas) {
            console.error('❌ Canvas not available for event listeners');
            return;
        }
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        console.log('✅ Annotation event listeners setup complete');
    }

    // ========== TOOL SELECTION ==========
    selectTool(toolName) {
        console.log(`🔧 Selecting tool: ${toolName}`);

        // Cancel any ongoing drawing
        this.cancelDrawing();

        // CRITICAL: Force deselect polygon when changing tools
        if (this.selectedAnnotation && this.selectedAnnotation.type === 'polygon') {
            console.log('🚫 Force deselecting polygon when changing tools');
            this.selectedAnnotation = null;
            this.selectedAnnotationIndex = -1;
        }

        this.currentTool = toolName;

        // Update UI - highlight active tool
        document.querySelectorAll('.annotation-tool').forEach(btn => {
            const isActive = btn.getAttribute('data-tool') === toolName;
            btn.classList.toggle('active', isActive);
        });

        // Show notification with usage hints
        const toolMessages = {
            'boundingbox': '📦 Bounding Box: Click and drag to draw rectangle',
            'polygon': '🔺 Polygon: Click to add points, click first point or press Enter to finish',
            'point': '📍 Point: Click to place point',
            'keypoint': '🎯 Keypoints: Click to place keypoints for selected template',
            'mask': '🎨 Mask Paint: Click+drag to paint new mask, right-drag to erase, [ ] brush size',
            'polyline': '📏 Polyline: Click to add points, double-click or Enter to finish'
        };

        NotificationManager.info(toolMessages[toolName] || `${toolName} tool selected`);

        // Special handling for keypoint tool
        if (toolName === 'keypoint') {
            this.showKeypointPreview();
        } else {
            this.hideKeypointPreview();
        }

        console.log(`✅ Tool selected: ${toolName}`);
    }

    // ========== MOUSE EVENTS FOR ANNOTATION ==========
    handleMouseDown(e) {
        console.log('🖱️ Mouse down event received');
        
        if (!this.canvas) {
            console.error('❌ Canvas not available in annotation manager');
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        console.log(`🖱️ Mouse position: screen(${x}, ${y})`);

        // Convert to image coordinates
        const imageCoords = this.app.canvasManager.screenToImage(x, y);
        console.log(`🖱️ Image coordinates: (${imageCoords.x}, ${imageCoords.y})`);

        // Check if clicking on resize handle first (ONLY if not drawing)
        if (this.selectedAnnotation && !this.isDrawing && !this.isPolygonDrawing && !this.isPolylineDrawing) {
            if (this.selectedAnnotation.type === 'boundingbox') {
                const handle = this.getResizeHandleAt(x, y, this.selectedAnnotation);
                if (handle) {
                    console.log('📏 Clicked on bounding box resize handle:', handle);
                    this.startResizing(handle);
                    return;
                }
            }
        }
        
        // Check if clicking on existing annotation
        const clickedAnnotation = this.getAnnotationAtPoint(imageCoords.x, imageCoords.y);
        
        if (clickedAnnotation) {
            console.log('🎯 Clicked on existing annotation');
            this.handleAnnotationClick(clickedAnnotation, e);
            
            // Check if clicking on polygon point handle AFTER selection (ONLY if not drawing)
            if (e.button === 0 && this.selectedAnnotation === clickedAnnotation.annotation && clickedAnnotation.annotation.type === 'polygon' && !this.isPolygonDrawing) {
                const pointIndex = this.getPolygonPointHandleAt(x, y, clickedAnnotation.annotation);
                if (pointIndex >= 0) {
                    console.log('📏 Clicked on polygon point handle:', pointIndex);
                    this.startResizing(`point-${pointIndex}`);
                    return;
                }
            }
            
            // Start dragging if left-click on selected annotation
            if (e.button === 0 && this.selectedAnnotation === clickedAnnotation.annotation) {
                console.log('🚚 Starting drag for selected annotation');
                this.startDragging(clickedAnnotation.annotation, imageCoords.x, imageCoords.y);
            }
            return;
        }

        // Handle right-click for panning (ONLY if no annotation clicked)
        if (e.button === 2 && !clickedAnnotation) { // Right mouse button
            console.log('🖱️ Right click - starting panning');
            this.app.canvasManager.startPanning(x, y);
            return;
        }

        // Handle left-click for drawing
        if (e.button === 0) { // Left mouse button
            console.log(`🖱️ Left click - starting drawing with tool: ${this.currentTool}`);
            this.handleDrawingStart(imageCoords.x, imageCoords.y, e);
        }
    }

    handleMouseMove(e) {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Handle panning
        if (this.app.canvasManager.isPanning) {
            this.app.canvasManager.updatePanning(x, y);
            return;
        }

        // Handle resizing
        if (this.isResizing) {
            this.resizeAnnotation(x, y);
            return;
        }
        
        // Handle dragging
        if (this.isDragging) {
            this.updateDragging(x, y);
            return;
        }

        // Convert to image coordinates
        const imageCoords = this.app.canvasManager.screenToImage(x, y);

        // Handle drawing operations
        this.handleDrawingMove(imageCoords.x, imageCoords.y, e);

        // Update cursor based on hover
        this.updateCursor(imageCoords.x, imageCoords.y);
    }

    handleMouseUp(e) {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Stop panning
        if (this.app.canvasManager.isPanning) {
            this.app.canvasManager.stopPanning();
            return;
        }

        // Stop resizing
        if (this.isResizing) {
            this.stopResizing();
            return;
        }
        
        // Stop dragging
        if (this.isDragging) {
            this.stopDragging();
            return;
        }

        // Convert to image coordinates
        const imageCoords = this.app.canvasManager.screenToImage(x, y);

        // Handle drawing end
        this.handleDrawingEnd(imageCoords.x, imageCoords.y, e);
    }

    handleRightClick(e) {
        e.preventDefault();
        
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const imageCoords = this.app.canvasManager.screenToImage(x, y);

        // Check if right-clicking on annotation
        const clickedAnnotation = this.getAnnotationAtPoint(imageCoords.x, imageCoords.y);
        
        if (clickedAnnotation) {
            this.handleAnnotationRightClick(clickedAnnotation, x, y, e);
        }
    }

    // ========== DRAWING HANDLERS ==========
    handleDrawingStart(x, y, e) {
        console.log(`🎨 Drawing start: tool=${this.currentTool}, label=${this.app.selectedLabel}, coords=(${x}, ${y})`);
        
        if (!this.app.selectedLabel) {
            console.log('❌ No label selected');
            NotificationManager.error('Please select a label first');
            return;
        }

        switch (this.currentTool) {
            case 'boundingbox':
                console.log('📦 Starting bounding box');
                this.startBoundingBox(x, y);
                break;
            case 'polygon':
                console.log('🔺 Adding polygon point');
                this.addPolygonPoint(x, y);
                break;
            case 'point':
                console.log('📍 Adding point');
                this.addPoint(x, y);
                break;
            case 'keypoint':
                console.log('🎯 Adding keypoint');
                this.addKeypoint(x, y);
                break;
            case 'mask':
                console.log('🎨 Starting mask painting');
                this.startMaskPainting(x, y);
                break;
            case 'polyline':
                console.log('📏 Adding polyline point');
                this.addPolylinePoint(x, y);
                break;
        }
    }

    handleDrawingMove(x, y, e) {
        console.log(`🖱️ Drawing move: tool=${this.currentTool}, coords=(${x}, ${y})`);
        
        switch (this.currentTool) {
            case 'boundingbox':
                if (this.isDrawing) {
                    console.log('📦 Updating bounding box preview');
                    this.updateBoundingBox(x, y);
                }
                break;
            case 'polygon':
                if (this.isPolygonDrawing && this.polygonPoints.length > 0) {
                    console.log('🔺 Updating polygon preview');
                    this.app.redrawCanvas();
                    this.drawPolygonPreview();
                    this.drawPolygonPreviewWithMouse(x, y);
                }
                break;
            case 'polyline':
                if (this.isPolylineDrawing && this.polylinePoints.length > 0) {
                    console.log('📏 Updating polyline preview');
                    this.app.redrawCanvas();
                    this.drawPolylinePreview();
                    this.drawPolylinePreviewWithMouse(x, y);
                }
                break;
            case 'mask':
                this.updateMaskPainting(x, y, e);
                break;
        }
    }

    handleDrawingEnd(x, y, e) {
        switch (this.currentTool) {
            case 'boundingbox':
                this.finishBoundingBox(x, y);
                break;
            case 'mask':
                this.stopMaskPainting();
                break;
        }
    }

    // ========== BOUNDING BOX DRAWING ==========
    startBoundingBox(x, y) {
        this.isDrawing = true;
        this.currentBbox = {
            startX: x,
            startY: y,
            endX: x,
            endY: y
        };
        console.log('📦 Started bounding box');
    }

    updateBoundingBox(x, y) {
        if (!this.isDrawing || !this.currentBbox) return;

        this.currentBbox.endX = x;
        this.currentBbox.endY = y;
        
        // Real-time preview için canvas'ı yeniden çiz
        this.app.redrawCanvas();
        this.drawTemporaryBoundingBox();
        
        console.log(`📦 Bounding box preview: (${x}, ${y})`);
    }

    drawTemporaryBoundingBox() {
        if (!this.isDrawing || !this.currentBbox) {
            console.log('❌ Cannot draw temporary bbox: isDrawing=', this.isDrawing, 'currentBbox=', this.currentBbox);
            return;
        }

        const ctx = this.ctx;
        if (!ctx) {
            console.log('❌ No canvas context for temporary bbox');
            return;
        }

        console.log('🎨 Drawing temporary bounding box');
        ctx.save();
        
        // Kesikli çizgi ile preview
        const color = this.app.selectedLabel ? this.app.labelColors[this.app.selectedLabel] || '#007AFF' : '#007AFF';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        // Convert image coordinates to screen coordinates
        const startScreen = this.app.canvasManager.imageToScreen(this.currentBbox.startX, this.currentBbox.startY);
        const endScreen = this.app.canvasManager.imageToScreen(this.currentBbox.endX, this.currentBbox.endY);
        
        const width = endScreen.x - startScreen.x;
        const height = endScreen.y - startScreen.y;
        
        console.log(`🎨 Drawing bbox: start(${startScreen.x}, ${startScreen.y}) size(${width}, ${height})`);
        
        // Draw the rectangle
        ctx.strokeRect(startScreen.x, startScreen.y, width, height);
        
        ctx.restore();
        console.log('✅ Temporary bounding box drawn');
    }

    finishBoundingBox(x, y) {
        if (!this.isDrawing || !this.currentBbox) return;

        this.currentBbox.endX = x;
        this.currentBbox.endY = y;

        const width = Math.abs(this.currentBbox.endX - this.currentBbox.startX);
        const height = Math.abs(this.currentBbox.endY - this.currentBbox.startY);

        if (width > 5 && height > 5) {
            const annotation = {
                type: 'boundingbox',
                label: this.app.selectedLabel,
                bbox: {
                    x: Math.min(this.currentBbox.startX, this.currentBbox.endX),
                    y: Math.min(this.currentBbox.startY, this.currentBbox.endY),
                    width: width,
                    height: height
                },
                color: this.app.labelColors[this.app.selectedLabel],
                timestamp: Date.now()
            };

            this.addAnnotation(annotation);
        }

        this.isDrawing = false;
        this.currentBbox = null;
        this.app.redrawCanvas();
    }

    // ========== POINT ANNOTATION ==========
    addPoint(x, y) {
        console.log(`📍 Creating point annotation at (${x}, ${y}) with label: ${this.app.selectedLabel}`);
        
        const annotation = {
            type: 'point',
            label: this.app.selectedLabel,
            x: x,
            y: y,
            color: this.app.labelColors[this.app.selectedLabel],
            timestamp: Date.now()
        };

        console.log('📍 Point annotation created:', annotation);
        this.addAnnotation(annotation);
        console.log('📍 Point added successfully');
    }

    // ========== ANNOTATION MANAGEMENT ==========
    addAnnotation(annotation) {
        console.log('💾 Adding annotation:', annotation);
        
        if (!this.app.currentImage) {
            console.log('❌ No current image available');
            return;
        }

        // CRITICAL FIX: Use the ACTUALLY SELECTED image from UI
        const selectedImage = this.app.images[this.app.currentImageIndex];
        if (!selectedImage) {
            console.log('❌ No selected image found at index:', this.app.currentImageIndex);
            return;
        }
        
        console.log('🚨 CRITICAL DEBUG - Annotation being added:');
        console.log('🚨 this.app.currentImageIndex:', this.app.currentImageIndex);
        console.log('🚨 this.app.images.length:', this.app.images.length);
        console.log('🚨 selectedImage:', selectedImage);
        console.log('🚨 selectedImage.path:', selectedImage.path);
        console.log('🚨 this.app.currentImage:', this.app.currentImage);
        console.log('🚨 this.app.currentImage.path:', this.app.currentImage ? this.app.currentImage.path : 'null');
        
        // FORCE SYNCHRONIZATION: Update currentImage to match selected image
        if (this.app.currentImage && this.app.currentImage.path !== selectedImage.path) {
            console.log('🚨 SYNCHRONIZATION ISSUE DETECTED!');
            console.log('🚨 currentImage.path:', this.app.currentImage.path);
            console.log('🚨 selectedImage.path:', selectedImage.path);
            console.log('🚨 FORCING SYNCHRONIZATION...');
            this.app.currentImage = selectedImage;
        }
        
        // ALWAYS use selectedImage.path, never currentImage.path
        const imagePath = selectedImage.path;
        console.log(`💾 Image path: ${imagePath}`);
        console.log(`💾 Current image object:`, this.app.currentImage);
        console.log(`💾 All annotations before adding:`, this.app.annotations);
        
        if (!this.app.annotations[imagePath]) {
            this.app.annotations[imagePath] = [];
            console.log('💾 Created new annotation array for image');
        }

        this.app.annotations[imagePath].push(annotation);
        console.log(`💾 Annotation added to array. Total annotations: ${this.app.annotations[imagePath].length}`);
        console.log(`💾 All annotations after adding:`, this.app.annotations);
        
        this.app.historyManager.saveToHistory('add_annotation', { annotation });
        console.log('💾 History saved');
        
        this.app.redrawCanvas();
        console.log('💾 Canvas redrawn');
        
        this.app.uiManager.updateProgress();
        console.log('💾 Progress updated');

        console.log('✅ Annotation added successfully:', annotation);
    }

    getAnnotationAtPoint(x, y) {
        if (!this.app.currentImage) return null;

        // CRITICAL: Use the selected image path, not currentImage.path
        const selectedImage = this.app.images[this.app.currentImageIndex];
        if (!selectedImage) return null;
        
        const imagePath = selectedImage.path;
        const annotations = this.app.annotations[imagePath] || [];

        // Check annotations in reverse order (top to bottom)
        for (let i = annotations.length - 1; i >= 0; i--) {
            const annotation = annotations[i];
            
            if (this.isPointInAnnotation(x, y, annotation)) {
                return { annotation, index: i };
            }
        }

        return null;
    }

    isPointInAnnotation(x, y, annotation) {
        switch (annotation.type) {
            case 'boundingbox':
                return x >= annotation.bbox.x && x <= annotation.bbox.x + annotation.bbox.width &&
                       y >= annotation.bbox.y && y <= annotation.bbox.y + annotation.bbox.height;
            case 'point':
                const distance = Math.sqrt((x - annotation.x) ** 2 + (y - annotation.y) ** 2);
                return distance <= 10; // 10 pixel radius
            case 'polygon':
                return this.isPointInPolygon(x, y, annotation.points);
            default:
                return false;
        }
    }

    isPointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            if (((points[i].y > y) !== (points[j].y > y)) &&
                (x < (points[j].x - points[i].x) * (y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    // ========== CANCEL DRAWING ==========
    cancelDrawing() {
        this.isDrawing = false;
        this.isPolygonDrawing = false;
        this.isPolylineDrawing = false;
        this.isMaskPainting = false;
        this.currentBbox = null;
        this.polygonPoints = [];
        this.polylinePoints = [];
        this.currentMaskAnnotation = null;
        
        console.log('🚫 Drawing canceled');
    }

    // ========== KEYPOINT PREVIEW ==========
    showKeypointPreview() {
        if (!this.app.selectedLabel) return;

        const template = CONFIG.KEYPOINT_TEMPLATES[this.app.selectedLabel];
        if (template) {
            this.keypointPreviewMode = true;
            this.currentKeypointGuide = template;
            console.log(`🎯 Showing keypoint preview for: ${template.name}`);
        }
    }

    hideKeypointPreview() {
        this.keypointPreviewMode = false;
        this.currentKeypointGuide = null;
    }

    // ========== UPDATE CURSOR ==========
    updateCursor(x, y) {
        if (!this.canvas) return;
        
        // Convert to image coordinates for annotation detection
        const imageCoords = this.app.canvasManager.screenToImage(x, y);
        
        // Check for resize handles first
        if (this.selectedAnnotation && !this.isDrawing && !this.isPolygonDrawing && !this.isPolylineDrawing) {
            if (this.selectedAnnotation.type === 'boundingbox') {
                const handle = this.getResizeHandleAt(x, y, this.selectedAnnotation);
                if (handle) {
                    this.canvas.style.cursor = 'nw-resize';
                    return;
                }
            } else if (this.selectedAnnotation.type === 'polygon') {
                const pointIndex = this.getPolygonPointHandleAt(x, y, this.selectedAnnotation);
                if (pointIndex >= 0) {
                    this.canvas.style.cursor = 'move';
                    return;
                }
            }
        }
        
        // Check for annotation hover using image coordinates
        const clickedAnnotation = this.getAnnotationAtPoint(imageCoords.x, imageCoords.y);
        
        if (clickedAnnotation) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    // ========== ANNOTATION CLICK HANDLERS ==========
    handleAnnotationClick(clickedAnnotation, e) {
        this.selectAnnotation(clickedAnnotation.annotation, clickedAnnotation.index);
    }

    handleAnnotationRightClick(clickedAnnotation, x, y, e) {
        e.preventDefault();
        this.selectAnnotation(clickedAnnotation.annotation, clickedAnnotation.index);
        console.log('🖱️ Right-clicked on annotation:', clickedAnnotation.annotation.type);
    }

    selectAnnotation(annotation, index) {
        // Deselect previous annotation if different
        if (this.selectedAnnotation && this.selectedAnnotation !== annotation) {
            console.log('🔄 Deselecting previous annotation');
        }
        
        this.selectedAnnotation = annotation;
        this.selectedAnnotationIndex = index;
        this.app.redrawCanvas();
        console.log('✅ Annotation selected:', annotation.type);
        
        // Show selection info with more details
        NotificationManager.info(`Selected ${annotation.label} (${annotation.type}) annotation`);
        
        // Enable individual annotation editing
        this.enableIndividualEditing(annotation);
    }
    
    enableIndividualEditing(annotation) {
        // Enable individual editing features
        console.log(`🔧 Enabling individual editing for ${annotation.type} annotation`);
        
        // Add visual feedback for individual editing
        if (annotation.type === 'boundingbox') {
            console.log('📦 Bounding box individual editing enabled');
        } else if (annotation.type === 'polygon') {
            console.log('🔺 Polygon individual editing enabled');
        } else if (annotation.type === 'point') {
            console.log('📍 Point individual editing enabled');
        }
    }
    
    // ========== ANNOTATION EDITING SYSTEM ==========
    startResizing(handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        console.log('📏 Started resizing annotation:', handle);
    }
    
    resizeAnnotation(x, y) {
        if (!this.isResizing || !this.selectedAnnotation || !this.resizeHandle) return;
        
        const imageCoords = this.app.canvasManager.screenToImage(x, y);
        const mouseX = imageCoords.x;
        const mouseY = imageCoords.y;
        
        // Bounding box resizing
        if (this.selectedAnnotation.type === 'boundingbox') {
            const bbox = this.selectedAnnotation.bbox;
            const minSize = 10;
            
            switch (this.resizeHandle) {
                case 'nw': // North-west corner
                    const newWidth = bbox.width + (bbox.x - mouseX);
                    const newHeight = bbox.height + (bbox.y - mouseY);
                    if (newWidth > minSize && newHeight > minSize) {
                        bbox.x = mouseX;
                        bbox.y = mouseY;
                        bbox.width = newWidth;
                        bbox.height = newHeight;
                    }
                    break;
                case 'ne': // North-east corner
                    const newWidth2 = mouseX - bbox.x;
                    const newHeight2 = bbox.height + (bbox.y - mouseY);
                    if (newWidth2 > minSize && newHeight2 > minSize) {
                        bbox.y = mouseY;
                        bbox.width = newWidth2;
                        bbox.height = newHeight2;
                    }
                    break;
                case 'sw': // South-west corner
                    const newWidth3 = bbox.width + (bbox.x - mouseX);
                    const newHeight3 = mouseY - bbox.y;
                    if (newWidth3 > minSize && newHeight3 > minSize) {
                        bbox.x = mouseX;
                        bbox.width = newWidth3;
                        bbox.height = newHeight3;
                    }
                    break;
                case 'se': // South-east corner
                    const newWidth4 = mouseX - bbox.x;
                    const newHeight4 = mouseY - bbox.y;
                    if (newWidth4 > minSize && newHeight4 > minSize) {
                        bbox.width = newWidth4;
                        bbox.height = newHeight4;
                    }
                    break;
            }
        }
        
        // Polygon point resizing
        if (this.selectedAnnotation.type === 'polygon' && this.resizeHandle.startsWith('point-')) {
            const pointIndex = parseInt(this.resizeHandle.split('-')[1]);
            if (pointIndex >= 0 && pointIndex < this.selectedAnnotation.points.length) {
                this.selectedAnnotation.points[pointIndex].x = mouseX;
                this.selectedAnnotation.points[pointIndex].y = mouseY;
                console.log(`📏 Moved polygon point ${pointIndex} to (${mouseX}, ${mouseY})`);
            }
        }
        
        this.app.redrawCanvas();
    }
    
    stopResizing() {
        this.isResizing = false;
        this.resizeHandle = null;
        console.log('📏 Stopped resizing');
    }
    
    getResizeHandleAt(screenX, screenY, annotation) {
        if (annotation.type !== 'boundingbox') return null;
        
        const bboxScreen = this.app.canvasManager.imageToScreen(annotation.bbox.x, annotation.bbox.y);
        const bboxWidth = annotation.bbox.width * this.app.canvasManager.zoom;
        const bboxHeight = annotation.bbox.height * this.app.canvasManager.zoom;
        
        const handleSize = 12;
        const tolerance = 30;
        
        // Check each corner handle
        const handles = [
            { x: bboxScreen.x - handleSize/2, y: bboxScreen.y - handleSize/2, type: 'nw' },
            { x: bboxScreen.x + bboxWidth - handleSize/2, y: bboxScreen.y - handleSize/2, type: 'ne' },
            { x: bboxScreen.x - handleSize/2, y: bboxScreen.y + bboxHeight - handleSize/2, type: 'sw' },
            { x: bboxScreen.x + bboxWidth - handleSize/2, y: bboxScreen.y + bboxHeight - handleSize/2, type: 'se' }
        ];
        
        for (const handle of handles) {
            const distance = Math.sqrt((screenX - handle.x - handleSize/2) ** 2 + (screenY - handle.y - handleSize/2) ** 2);
            if (distance <= tolerance) {
                return handle.type;
            }
        }
        
        return null;
    }
    
    getPolygonPointHandleAt(screenX, screenY, annotation) {
        if (annotation.type !== 'polygon') return -1;
        
        const handleSize = 12;
        const tolerance = 30;
        
        // Check each polygon point handle
        for (let i = 0; i < annotation.points.length; i++) {
            const point = annotation.points[i];
            const screenPoint = this.app.canvasManager.imageToScreen(point.x, point.y);
            
            const distance = Math.sqrt((screenX - screenPoint.x) ** 2 + (screenY - screenPoint.y) ** 2);
            if (distance <= tolerance) {
                return i;
            }
        }
        
        return -1;
    }
    
    // ========== DRAGGING SYSTEM ==========
    startDragging(annotation, x, y) {
        this.isDragging = true;
        this.selectedAnnotation = annotation;
        
        // Calculate drag offset based on annotation type
        if (annotation.type === 'boundingbox') {
            this.dragOffset.x = x - annotation.bbox.x;
            this.dragOffset.y = y - annotation.bbox.y;
        } else if (annotation.type === 'point') {
            this.dragOffset.x = x - annotation.x;
            this.dragOffset.y = y - annotation.y;
        }
        
        console.log('🚚 Started dragging annotation:', annotation.type);
    }
    
    updateDragging(x, y) {
        if (!this.isDragging || !this.selectedAnnotation) return;
        
        const imageCoords = this.app.canvasManager.screenToImage(x, y);
        const mouseX = imageCoords.x;
        const mouseY = imageCoords.y;
        
        // Update annotation position based on type
        if (this.selectedAnnotation.type === 'boundingbox') {
            this.selectedAnnotation.bbox.x = mouseX - this.dragOffset.x;
            this.selectedAnnotation.bbox.y = mouseY - this.dragOffset.y;
        } else if (this.selectedAnnotation.type === 'point') {
            this.selectedAnnotation.x = mouseX - this.dragOffset.x;
            this.selectedAnnotation.y = mouseY - this.dragOffset.y;
        }
        
        this.app.redrawCanvas();
    }
    
    stopDragging() {
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        console.log('🚚 Stopped dragging');
    }
    
    // ========== KEYBOARD EVENTS ==========
    handleKeyDown(e) {
        console.log('⌨️ Key pressed:', e.key);
        
        // Tool selection shortcuts
        if (e.key === '1') {
            this.selectTool('boundingbox');
            e.preventDefault();
        } else if (e.key === '2') {
            this.selectTool('polygon');
            e.preventDefault();
        } else if (e.key === '3') {
            this.selectTool('point');
            e.preventDefault();
        } else if (e.key === '4') {
            this.selectTool('keypoint');
            e.preventDefault();
        } else if (e.key === '5') {
            this.selectTool('mask');
            e.preventDefault();
        } else if (e.key === '6') {
            this.selectTool('polyline');
            e.preventDefault();
        }
        
        // ESC key - cancel current operation
        if (e.key === 'Escape') {
            this.cancelDrawing();
            this.selectedAnnotation = null;
            this.selectedAnnotationIndex = -1;
            this.app.redrawCanvas();
            console.log('🚫 Cancelled current operation');
        }
        
        // Delete key - delete selected annotation
        if (e.key === 'Delete' && this.selectedAnnotation) {
            this.deleteSelectedAnnotation();
        }
        
        // Enter key - finish polygon/polyline
        if (e.key === 'Enter') {
            if (this.isPolygonDrawing && this.polygonPoints.length >= 3) {
                this.finishPolygon();
            } else if (this.isPolylineDrawing && this.polylinePoints.length >= 2) {
                this.finishPolyline();
            }
        }
        
        // Zoom shortcuts
        if (e.key === '+' || e.key === '=') {
            this.app.canvasManager.zoomIn();
            e.preventDefault();
        } else if (e.key === '-') {
            this.app.canvasManager.zoomOut();
            e.preventDefault();
        } else if (e.key === '0') {
            this.app.canvasManager.fitToScreen();
            e.preventDefault();
        }
    }
    
    handleKeyUp(e) {
        // Handle key up events if needed
    }
    
    deleteSelectedAnnotation() {
        if (!this.selectedAnnotation || !this.app.currentImage) return;
        
        const imagePath = this.app.currentImage.path;
        const annotations = this.app.annotations[imagePath] || [];
        const index = annotations.indexOf(this.selectedAnnotation);
        
        if (index >= 0) {
            annotations.splice(index, 1);
            this.selectedAnnotation = null;
            this.selectedAnnotationIndex = -1;
            this.app.redrawCanvas();
            this.app.uiManager.updateProgress();
            console.log('🗑️ Deleted annotation');
        }
    }
    
    // ========== PS-QUALITY MOUSE WHEEL ZOOM ==========
    handleWheel(e) {
        e.preventDefault();
        
        if (!this.canvas) return;
        
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // PS-QUALITY: Zoom around mouse position
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = this.app.canvasManager.zoom * zoomFactor;
        
        // Use PS-quality zoom around point
        this.app.canvasManager.zoomAroundPoint(mouseX, mouseY, newZoom);
        
        console.log(`🔍 PS-Quality Wheel zoom: ${zoomFactor > 1 ? 'in' : 'out'} to ${(newZoom * 100).toFixed(0)}% at (${mouseX}, ${mouseY})`);
    }

    // ========== POLYGON ANNOTATION ==========
    addPolygonPoint(x, y) {
        console.log(`🔺 Adding polygon point at (${x}, ${y})`);
        
        if (!this.app.selectedLabel) {
            NotificationManager.error('Please select a label first');
            return;
        }

        if (!this.isPolygonDrawing) {
            // Start new polygon
            this.isPolygonDrawing = true;
            this.polygonPoints = [];
            console.log('🔺 Starting new polygon');
        }

        this.polygonPoints.push({ x, y });
        console.log(`🔺 Polygon points: ${this.polygonPoints.length}`);

        // If we have at least 3 points and click near the first point, finish polygon
        if (this.polygonPoints.length >= 3) {
            const firstPoint = this.polygonPoints[0];
            const distance = Math.sqrt((x - firstPoint.x) ** 2 + (y - firstPoint.y) ** 2);
            
            if (distance < 20) { // Close to first point
                this.finishPolygon();
                return;
            }
        }

        // Redraw to show current polygon
        this.app.redrawCanvas();
        this.drawPolygonPreview();
    }

    finishPolygon() {
        if (this.polygonPoints.length < 3) {
            NotificationManager.error('Polygon needs at least 3 points');
            return;
        }

        const annotation = {
            type: 'polygon',
            label: this.app.selectedLabel,
            points: [...this.polygonPoints],
            color: this.app.labelColors[this.app.selectedLabel],
            timestamp: Date.now()
        };

        this.addAnnotation(annotation);
        this.isPolygonDrawing = false;
        this.polygonPoints = [];
        console.log('🔺 Polygon finished');
    }

    drawPolygonPreview() {
        if (this.polygonPoints.length === 0) return;

        const ctx = this.ctx;
        if (!ctx) return;

        ctx.save();
        
        // Kesikli çizgi ile preview
        const color = this.app.selectedLabel ? this.app.labelColors[this.app.selectedLabel] || '#FF6B6B' : '#FF6B6B';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        if (this.polygonPoints.length > 1) {
            ctx.beginPath();
            const firstPoint = this.app.canvasManager.imageToScreen(this.polygonPoints[0].x, this.polygonPoints[0].y);
            ctx.moveTo(firstPoint.x, firstPoint.y);
            
            for (let i = 1; i < this.polygonPoints.length; i++) {
                const point = this.app.canvasManager.imageToScreen(this.polygonPoints[i].x, this.polygonPoints[i].y);
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }

        // Draw points with enhanced styling
        this.polygonPoints.forEach((point, index) => {
            const isFirst = index === 0;
            const radius = isFirst ? 6 : 4;
            const screenPoint = this.app.canvasManager.imageToScreen(point.x, point.y);

            // Point background (white)
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(screenPoint.x, screenPoint.y, radius + 1, 0, 2 * Math.PI);
            ctx.fill();

            // Point color
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(screenPoint.x, screenPoint.y, radius, 0, 2 * Math.PI);
            ctx.fill();

            // First point indicator - RED CIRCLE for closing
            if (isFirst && this.polygonPoints.length >= 3) {
                ctx.strokeStyle = '#FF3B30';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(screenPoint.x, screenPoint.y, 12, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Point numbers
            ctx.fillStyle = 'white';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText((index + 1).toString(), screenPoint.x, screenPoint.y + 3);
        });

        // Show close hint
        if (this.polygonPoints.length >= 3) {
            const firstPoint = this.polygonPoints[0];
            const firstScreen = this.app.canvasManager.imageToScreen(firstPoint.x, firstPoint.y);
            ctx.fillStyle = 'rgba(255, 59, 48, 0.8)';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('Click here to close', firstScreen.x, firstScreen.y - 20);
        }

        ctx.restore();
    }

    drawPolygonPreviewWithMouse(mouseX, mouseY) {
        if (this.polygonPoints.length === 0) return;

        const ctx = this.ctx;
        if (!ctx) return;

        ctx.save();
        
        const lastPoint = this.polygonPoints[this.polygonPoints.length - 1];
        
        // Convert image coordinates to screen coordinates
        const lastScreen = this.app.canvasManager.imageToScreen(lastPoint.x, lastPoint.y);
        const mouseScreen = this.app.canvasManager.imageToScreen(mouseX, mouseY);
        
        // Check if mouse is near first point (close area)
        const firstPoint = this.polygonPoints[0];
        const firstScreen = this.app.canvasManager.imageToScreen(firstPoint.x, firstPoint.y);
        const distanceToFirst = Math.sqrt((mouseScreen.x - firstScreen.x) ** 2 + (mouseScreen.y - firstScreen.y) ** 2);
        const closeThreshold = 20;
        
        if (distanceToFirst < closeThreshold && this.polygonPoints.length >= 3) {
            // KIRMIZI DÜZ ÇİZGİ - kapatma için
            ctx.strokeStyle = '#FF3B30';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
        } else {
            // Normal etiket rengi çizgi
            const color = this.app.selectedLabel ? this.app.labelColors[this.app.selectedLabel] || '#FF6B6B' : '#FF6B6B';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Kesikli çizgi
        }
        
        ctx.beginPath();
        ctx.moveTo(lastScreen.x, lastScreen.y);
        ctx.lineTo(mouseScreen.x, mouseScreen.y);
        ctx.stroke();
        
        ctx.restore();
    }

    drawPolylinePreview() {
        if (this.polylinePoints.length === 0) return;

        const ctx = this.ctx;
        if (!ctx) return;

        ctx.save();
        
        const color = this.app.selectedLabel ? this.app.labelColors[this.app.selectedLabel] || '#FF9500' : '#FF9500';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([5, 5]);

        if (this.polylinePoints.length > 1) {
            ctx.beginPath();
            const firstPoint = this.app.canvasManager.imageToScreen(this.polylinePoints[0].x, this.polylinePoints[0].y);
            ctx.moveTo(firstPoint.x, firstPoint.y);
            
            for (let i = 1; i < this.polylinePoints.length; i++) {
                const point = this.app.canvasManager.imageToScreen(this.polylinePoints[i].x, this.polylinePoints[i].y);
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }

        // Draw points
        ctx.fillStyle = color;
        this.polylinePoints.forEach(point => {
            const screenPoint = this.app.canvasManager.imageToScreen(point.x, point.y);
            ctx.beginPath();
            ctx.arc(screenPoint.x, screenPoint.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        ctx.restore();
    }

    drawPolylinePreviewWithMouse(mouseX, mouseY) {
        if (this.polylinePoints.length === 0) return;

        const ctx = this.ctx;
        if (!ctx) return;

        ctx.save();
        
        const lastPoint = this.polylinePoints[this.polylinePoints.length - 1];
        const color = this.app.selectedLabel ? this.app.labelColors[this.app.selectedLabel] || '#FF9500' : '#FF9500';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);

        // Convert image coordinates to screen coordinates
        const lastScreen = this.app.canvasManager.imageToScreen(lastPoint.x, lastPoint.y);
        const mouseScreen = this.app.canvasManager.imageToScreen(mouseX, mouseY);
        
        ctx.beginPath();
        ctx.moveTo(lastScreen.x, lastScreen.y);
        ctx.lineTo(mouseScreen.x, mouseScreen.y);
        ctx.stroke();
        
        ctx.restore();
    }

    // ========== KEYPOINT ANNOTATION ==========
    addKeypoint(x, y) {
        console.log(`🎯 Adding keypoint at (${x}, ${y})`);
        
        if (!this.app.selectedLabel) {
            NotificationManager.error('Please select a label first');
            return;
        }

        // For now, create a simple keypoint annotation
        const annotation = {
            type: 'keypoint',
            label: this.app.selectedLabel,
            x: x,
            y: y,
            color: this.app.labelColors[this.app.selectedLabel],
            timestamp: Date.now()
        };

        this.addAnnotation(annotation);
        console.log('🎯 Keypoint added');
    }

    // ========== MASK ANNOTATION ==========
    startMaskPainting(x, y) {
        console.log(`🎨 Starting mask painting at (${x}, ${y})`);
        
        if (!this.app.selectedLabel) {
            NotificationManager.error('Please select a label first');
            return;
        }

        this.isMaskPainting = true;
        this.currentMaskAnnotation = {
            type: 'mask',
            label: this.app.selectedLabel,
            points: [{ x, y }],
            color: this.app.labelColors[this.app.selectedLabel],
            timestamp: Date.now()
        };

        console.log('🎨 Mask painting started');
    }

    updateMaskPainting(x, y, e) {
        if (!this.isMaskPainting || !this.currentMaskAnnotation) return;

        this.currentMaskAnnotation.points.push({ x, y });
        this.app.redrawCanvas();
    }

    stopMaskPainting() {
        if (!this.isMaskPainting || !this.currentMaskAnnotation) return;

        if (this.currentMaskAnnotation.points.length > 5) {
            this.addAnnotation(this.currentMaskAnnotation);
        }

        this.isMaskPainting = false;
        this.currentMaskAnnotation = null;
        console.log('🎨 Mask painting stopped');
    }

    // ========== POLYLINE ANNOTATION ==========
    addPolylinePoint(x, y) {
        console.log(`📏 Adding polyline point at (${x}, ${y})`);
        
        if (!this.app.selectedLabel) {
            NotificationManager.error('Please select a label first');
            return;
        }

        if (!this.isPolylineDrawing) {
            // Start new polyline
            this.isPolylineDrawing = true;
            this.polylinePoints = [];
            console.log('📏 Starting new polyline');
        }

        this.polylinePoints.push({ x, y });
        console.log(`📏 Polyline points: ${this.polylinePoints.length}`);

        // Redraw to show current polyline
        this.app.redrawCanvas();
        this.drawPolylinePreview();
    }

    finishPolyline() {
        if (this.polylinePoints.length < 2) {
            NotificationManager.error('Polyline needs at least 2 points');
            return;
        }

        const annotation = {
            type: 'polyline',
            label: this.app.selectedLabel,
            points: [...this.polylinePoints],
            color: this.app.labelColors[this.app.selectedLabel],
            timestamp: Date.now()
        };

        this.addAnnotation(annotation);
        this.isPolylineDrawing = false;
        this.polylinePoints = [];
        console.log('📏 Polyline finished');
    }
}

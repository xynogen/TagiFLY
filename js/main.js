// TagiFLY v2.0.0 - Professional AI Labelling Tool
// Professional AI Labelling System

import { CONFIG } from './modules/config.js';
import { NotificationManager } from './modules/notification.js';
import { HistoryManager } from './modules/history.js';
import { UIManager } from './modules/ui.js';
import { ExportManager } from './modules/export.js';
import { CanvasManager } from './modules/canvas.js';

// ========== MAIN APPLICATION ==========
class TagiFLYApp {
    constructor() {
        // Core Data
        this.images = [];
        this.currentImageIndex = 0;
        this.labels = [...CONFIG.DEFAULT_LABELS];
        this.labelColors = {};
        this.selectedLabel = null;
        this.annotations = {};
        this.currentImageView = 'grid';

        // Simple Managers
        this.historyManager = new HistoryManager(this);
        this.uiManager = new UIManager(this);
        this.exportManager = new ExportManager(this);
        this.canvasManager = new CanvasManager(this);

        // Canvas reference
        this.canvas = null;
        this.ctx = null;
        this.currentImage = null;
        this.cachedImage = null; // Cache loaded image
        
        // Performance optimizations
        this.imageCache = new Map(); // Cache processed images
        this.annotationCache = new Map(); // Cache rendered annotations
        this.isRendering = false; // Prevent multiple renders
        this.renderQueue = []; // Queue render operations

        // Annotation state
        this.selectedTool = 'boundingbox';
        this.isDrawingBoundingBox = false;
        this.boundingBoxStart = null;
        this.currentBoundingBox = null;
        
        // Professional annotation state
        this.selectedAnnotations = new Set();
        this.hoveredAnnotation = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = null;
        this.resizeHandle = null;
        
        // Polygon and Polyline state
        this.currentPolygon = null;
        this.currentPolyline = null;
        this.isPolygonDrawing = false;
        this.isPolylineDrawing = false;
        
        // Mask Paint state
        this.isMaskPainting = false;
        this.maskBrushSize = 20;
        this.maskBrushColor = '#FF0000';
        this.maskPoints = [];
        this.maskBrushOpacity = 0.7;
        this.maskStrokes = []; // Store all mask strokes
        this.isErasing = false; // Erase mode toggle
        
        // Pose/Keypoint state
        this.currentPose = null;
        this.isPoseDrawing = false;
        this.poseTemplate = null;
        this.poseKeypoints = [];

        this.init();
    }

    // ========== INITIALIZATION ==========
    init() {
        console.log('🚀 TagiFLY v2.0.0 Professional System Starting...');
        
        try {
            // Get canvas
            const canvas = document.getElementById('imageCanvas');
            if (!canvas) {
                throw new Error('Canvas element not found!');
            }
            
            // Set canvas references
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            
            // Optimize canvas for high DPI
            this.canvasManager.optimizeCanvas();
            
            // Set canvas to full viewport size
            this.resizeCanvasToViewport();
            
            console.log('✅ Canvas initialized:', {
                width: canvas.width,
                height: canvas.height
            });
            
            // Initialize UI
            this.uiManager.initTheme();
            this.uiManager.renderLabels();
            this.updateUI();

            // Setup event listeners
            this.uiManager.setupEventListeners();
            
            // Setup canvas event listeners
            this.setupCanvasEventListeners();
            
        // Setup keyboard event listeners
        this.setupKeyboardEventListeners();
        
        // Setup window resize listener
        window.addEventListener('resize', () => {
            this.resizeCanvasToViewport();
            if (this.currentImage) {
                this.redrawCanvas();
            }
        });
        
        // Set default tool
        this.selectTool('boundingbox');
        
        // Performance optimization
        setInterval(() => {
            this.optimizePerformance();
        }, 30000); // Every 30 seconds
            
            console.log('✅ TagiFLY Simple System Ready!');
            NotificationManager.success('TagiFLY Simple System Ready!');

        } catch (error) {
            console.error('❌ TagiFLY Error:', error);
            NotificationManager.error('Failed to initialize TagiFLY Simple System');
        }
    }

    // ========== CANVAS MANAGEMENT ==========
    resizeCanvasToViewport() {
        const viewport = document.querySelector('.image-viewport');
        if (!viewport) return;
        
        const rect = viewport.getBoundingClientRect();
        // Set canvas size to match viewport exactly
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Ensure canvas fills viewport completely
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        console.log('📐 Canvas resized to viewport:', {
            width: this.canvas.width,
            height: this.canvas.height,
            viewportWidth: rect.width,
            viewportHeight: rect.height
        });
    }

    // ========== IMAGE MANAGEMENT ==========
    loadImage(imageObj) {
        console.log('🖼️ Loading image:', imageObj.path);
        
        this.currentImage = imageObj;
        
        // Clear all drawing states when switching images
        this.isDrawingBoundingBox = false;
        this.isPolygonDrawing = false;
        this.isPolylineDrawing = false;
        this.isMaskPainting = false;
        this.isPoseDrawing = false;
        this.currentBoundingBox = null;
        this.currentPolygon = null;
        this.currentPolyline = null;
        this.poseKeypoints = [];
        this.poseTemplate = null;
        this.maskPoints = [];
        
        // Clear selected annotations
        this.selectedAnnotations.clear();
        
        // Force redraw canvas first
        this.redrawCanvas();
        
        // Adobe PS style: Auto fit to screen when image loads
        setTimeout(() => {
            this.canvasManager.fitToScreen();
        }, 100); // Small delay to ensure image is loaded
        
        console.log('✅ Image loaded successfully');
    }

    redrawCanvas() {
        if (!this.currentImage) {
            console.log('❌ No current image to draw');
            return;
        }
        
        // Prevent multiple renders
        if (this.isRendering) {
            this.renderQueue.push('redraw');
            return;
        }
        
        this.isRendering = true;
        
        console.log('🎨 Redrawing canvas...');
        
        // Resize canvas to viewport first
        this.resizeCanvasToViewport();
        
        // Clear canvas - NO BACKGROUND for Photoshop style
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Check cache first
        const cacheKey = this.currentImage.path;
        if (this.imageCache.has(cacheKey)) {
            const cachedData = this.imageCache.get(cacheKey);
            this.cachedImage = cachedData.image;
            this.canvasManager.setImageDimensions(cachedData.width, cachedData.height);
            this.currentImage.originalWidth = cachedData.width;
            this.currentImage.originalHeight = cachedData.height;
            this.drawImageAndAnnotations();
            this.hideCanvasOverlay();
            this.isRendering = false;
            this.processRenderQueue();
            return;
        }
        
        // Draw image
        const img = new Image();
        img.onload = () => {
            console.log('🎨 Image loaded successfully:', {
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height
            });
            
            // Cache the image
            this.cachedImage = img;
            
            // Cache image data
            this.imageCache.set(cacheKey, {
                image: img,
                width: img.naturalWidth,
                height: img.naturalHeight
            });
            
            // Set image dimensions in canvas manager
            this.canvasManager.setImageDimensions(img.naturalWidth, img.naturalHeight);
            
            // Set original dimensions in current image
            this.currentImage.originalWidth = img.naturalWidth;
            this.currentImage.originalHeight = img.naturalHeight;
            
            this.drawImageAndAnnotations();
            
            // Hide canvas overlay when image is loaded
            this.hideCanvasOverlay();
            
            console.log('✅ Image drawn successfully');
            this.isRendering = false;
            this.processRenderQueue();
        };
        img.onerror = (error) => {
            console.error('❌ Error loading image:', error);
            console.error('❌ Image URL:', this.currentImage.url);
            this.isRendering = false;
            this.processRenderQueue();
        };
        img.src = this.currentImage.url;
    }

    // ========== COORDINATE CONVERSION METHODS ==========
    canvasToImageCoords(canvasX, canvasY) {
        if (!this.cachedImage) return { x: canvasX, y: canvasY };
        
        // Get zoom and pan values
        const zoom = this.canvasManager.getZoom();
        const pan = this.canvasManager.getPan();
        
        // Calculate image center position (same as in drawImageAndAnnotations)
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.cachedImage.naturalWidth;
        const imageHeight = this.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Convert canvas coordinates to image coordinates
        // First subtract the image position and pan, then divide by zoom
        const imageX = (canvasX - centerX - pan.x) / zoom;
        const imageY = (canvasY - centerY - pan.y) / zoom;
        
        return { x: imageX, y: imageY };
    }
    
    imageToCanvasCoords(imageX, imageY) {
        if (!this.cachedImage) return { x: imageX, y: imageY };
        
        // Get zoom and pan values
        const zoom = this.canvasManager.getZoom();
        const pan = this.canvasManager.getPan();
        
        // Calculate image center position (same as in drawImageAndAnnotations)
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.cachedImage.naturalWidth;
        const imageHeight = this.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Convert image coordinates to canvas coordinates
        // First multiply by zoom, then add image position and pan
        const canvasX = imageX * zoom + centerX + pan.x;
        const canvasY = imageY * zoom + centerY + pan.y;
        
        return { x: canvasX, y: canvasY };
    }
    
    // ========== SCREEN TO IMAGE COORDINATE CONVERSION ==========
    screenToImage(screenX, screenY) {
        return this.canvasToImageCoords(screenX, screenY);
    }
    
    imageToScreen(imageX, imageY) {
        return this.imageToCanvasCoords(imageX, imageY);
    }

    // ========== DRAWING METHODS ==========
    drawImageAndAnnotations() {
        if (!this.cachedImage) return;
        
        console.log('🎨 Drawing image and annotations...');
        console.log('📊 Cached image size:', this.cachedImage.naturalWidth, 'x', this.cachedImage.naturalHeight);
        
        // Get zoom and pan values from canvas manager
        const zoom = this.canvasManager.getZoom();
        const pan = this.canvasManager.getPan();
        
        console.log('🔍 Zoom:', zoom, 'Pan:', pan.x, pan.y);
        
        // Adobe PS style: Calculate image position to center it
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.cachedImage.naturalWidth;
        const imageHeight = this.cachedImage.naturalHeight;
        
        // Calculate scaled dimensions
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        // Center the image on canvas
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Apply pan offset
        const drawX = centerX + pan.x;
        const drawY = centerY + pan.y;
        
        console.log('📊 Canvas size:', canvasWidth, 'x', canvasHeight);
        console.log('📊 Image size:', imageWidth, 'x', imageHeight);
        console.log('📊 Scaled size:', scaledWidth, 'x', scaledHeight);
        console.log('📊 Draw position:', drawX, drawY);
        
        console.log('📊 Draw dimensions:', scaledWidth, 'x', scaledHeight);
        console.log('📊 Draw position:', drawX, drawY);
        
        // Draw image directly at calculated position
        this.ctx.drawImage(this.cachedImage, drawX, drawY, scaledWidth, scaledHeight);
        
        // Draw annotations with zoom and pan
        this.drawAnnotations();
        
        // Draw current bounding box if drawing
        if (this.isDrawingBoundingBox && this.currentBoundingBox) {
            this.drawCurrentBoundingBox();
        }
        
        console.log('✅ Image and annotations drawn successfully');
    }
    

    // ========== UI HELPER METHODS ==========
    hideCanvasOverlay() {
        const overlay = document.querySelector('.canvas-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            console.log('✅ Canvas overlay hidden');
        }
    }

    showCanvasOverlay() {
        const overlay = document.querySelector('.canvas-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            console.log('✅ Canvas overlay shown');
        }
    }

    // ========== CANVAS EVENT LISTENERS ==========
    setupCanvasEventListeners() {
        console.log('🎯 Setting up canvas event listeners');
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => this.canvasManager.handleWheelZoom(e));
        
        console.log('✅ Canvas event listeners added');
    }

    setupKeyboardEventListeners() {
        console.log('⌨️ Setting up keyboard event listeners');
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Zoom controls
        const zoomOutBtn = document.getElementById('zoomOut');
        const zoomInBtn = document.getElementById('zoomIn');
        const fitToScreenBtn = document.getElementById('fitToScreen');
        const actualSizeBtn = document.getElementById('actualSize');
        
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (fitToScreenBtn) fitToScreenBtn.addEventListener('click', () => this.fitToScreen());
        if (actualSizeBtn) actualSizeBtn.addEventListener('click', () => this.actualSize());
        
        // Export button
        const exportBtn = document.getElementById('exportData');
        if (exportBtn) exportBtn.addEventListener('click', () => this.openExportModal());
        
        console.log('✅ Keyboard event listeners added');
    }

    // ========== ANNOTATION METHODS ==========
    selectTool(toolName) {
        console.log('🔧 Tool selected:', toolName);
        this.selectedTool = toolName;
        
        // Update UI
        document.querySelectorAll('.annotation-tool').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tool="${toolName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Special handling for pose tool
        if (toolName === 'pose') {
            // Directly select Human Pose template without showing selector
            this.selectedPoseTemplate = 'person';
            this.selectedLabel = 'person';
            console.log('🎭 Human Pose template automatically selected');
            
            // Show enhanced notification with first point instruction
            const poseTemplate = CONFIG.KEYPOINT_TEMPLATES.person;
            const firstPoint = poseTemplate.points[0]; // 'nose'
            NotificationManager.success(`Human Pose (17 points) ready for annotation. First click: ${firstPoint}`);
            
            // Don't show pop-up, use notification instead
            console.log('🎭 Using notification instead of pop-up');
        } else {
            this.hidePoseTemplateSelector();
        }
    }

    handleMouseDown(e) {
        console.log('🖱️ Mouse down:', e.button);
        if (!this.currentImage) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to image coordinates considering zoom and pan
        const imageCoords = this.canvasToImageCoords(x, y);
        
        // Handle right-click for panning or mask erase
        if (e.button === 2) { // Right mouse button
            if (this.selectedTool === 'mask' && this.isMaskPainting) {
                // Right-click in mask mode = erase
                this.isErasing = true;
                this.maskBrushColor = '#FFFFFF'; // White for erase
                this.maskBrushOpacity = 1.0;
                console.log('🎨 Mask erase mode activated');
            } else {
                this.canvasManager.startPan(x, y);
            }
            return;
        }
        
        console.log('🖱️ Mouse position:', { x, y });
        
        // Check for annotation interaction first (only if not drawing)
        if (!this.isDrawingBoundingBox && !this.isPolygonDrawing && !this.isPolylineDrawing && !this.isMaskPainting) {
            const clickedAnnotation = this.getAnnotationAtPoint(x, y);
            const resizeHandle = this.getResizeHandleAt(x, y);
            
            if (resizeHandle) {
                this.resizeHandle = resizeHandle;
                this.isResizing = true;
                this.dragStart = { x, y };
                return;
            }
            
            if (clickedAnnotation) {
                if (e.ctrlKey || e.metaKey) {
                    // Multi-select
                    this.toggleAnnotationSelection(clickedAnnotation);
                } else {
                    // Single select
                    this.selectAnnotation(clickedAnnotation);
                }
                
                // Store drag start in canvas coordinates for simple delta calculation
                this.dragStart = { x, y };
                this.isDragging = true;
                return;
            }
        }
        
        // Deselect all annotations if clicking on empty space
        if (this.selectedAnnotations.size > 0) {
            this.selectedAnnotations.clear();
            
            // Smooth redraw without flickering
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.cachedImage) {
                this.drawCachedImage();
            }
            this.drawAnnotations();
        }
        
        // Start new annotation (only if no existing annotation was clicked)
        if (this.selectedTool === 'boundingbox') {
            this.startBoundingBox(imageCoords.x, imageCoords.y);
        } else if (this.selectedTool === 'point') {
            this.addPoint(imageCoords.x, imageCoords.y);
        } else if (this.selectedTool === 'polygon') {
            this.addPolygonPoint(imageCoords.x, imageCoords.y);
        } else if (this.selectedTool === 'polyline') {
            this.addPolylinePoint(imageCoords.x, imageCoords.y);
        } else if (this.selectedTool === 'keypoint') {
            this.addKeypoint(imageCoords.x, imageCoords.y);
        } else if (this.selectedTool === 'pose') {
            this.addPoseKeypoint(imageCoords.x, imageCoords.y);
        } else if (this.selectedTool === 'mask') {
            this.startMaskPaint(imageCoords.x, imageCoords.y);
            console.log('🎨 Mask paint started at:', { x, y });
        }
    }

    handleMouseMove(e) {
        if (!this.currentImage) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to image coordinates considering zoom and pan
        const imageCoords = this.canvasToImageCoords(x, y);
        
        // Handle panning
        if (this.canvasManager.isPanning) {
            this.canvasManager.updatePan(x, y);
            return;
        }
        
        // Update cursor based on hover state
        this.updateCursor(x, y);
        
        if (this.isDrawingBoundingBox) {
            this.updateBoundingBox(imageCoords.x, imageCoords.y);
        } else if (this.isDragging) {
            this.updateDragging(x, y);
        } else if (this.isResizing) {
            this.updateResizing(x, y);
        } else if (this.selectedTool === 'polygon' && this.currentPolygon) {
            this.updatePolygonPreview(imageCoords.x, imageCoords.y);
        } else if (this.selectedTool === 'polyline' && this.currentPolyline) {
            this.updatePolylinePreview(imageCoords.x, imageCoords.y);
        } else if (this.isMaskPainting) {
            this.updateMaskPaint(imageCoords.x, imageCoords.y);
        } else if (this.isPoseDrawing) {
            this.updatePosePreview(x, y);
        }
    }

    handleMouseUp(e) {
        console.log('🖱️ Mouse up');
        
        // Handle panning end
        if (this.canvasManager.isPanning) {
            this.canvasManager.endPan();
            return;
        }
        
        if (this.isDrawingBoundingBox) {
            this.finishBoundingBox();
        } else if (this.isDragging) {
            this.finishDragging();
        } else if (this.isResizing) {
            this.finishResizing();
        } else if (this.isMaskPainting) {
            this.finishMaskPaint();
            console.log('🎨 Mask paint finished');
        }
        
        // Reset interaction state
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = null;
        this.resizeHandle = null;
    }

    handleRightClick(e) {
        e.preventDefault();
        console.log('🖱️ Right click');
    }

    handleKeyboard(e) {
        console.log('⌨️ Key pressed:', e.key);
        
        // Check if user is typing in an input field
        const activeElement = document.activeElement;
        const isInputField = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.contentEditable === 'true'
        );
        
        // If user is typing in input field, don't handle shortcuts
        if (isInputField) {
            console.log('⌨️ User is typing in input field, skipping shortcuts');
            return;
        }
        
        // Prevent default for our shortcuts
        if (this.isShortcutKey(e.key)) {
            e.preventDefault();
        }
        
        // Label selection shortcuts (1-9)
        if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            if (index < this.labels.length) {
                this.selectLabel(this.labels[index]);
                console.log(`🏷️ Label selected via keyboard: ${this.labels[index]}`);
            }
        }
        
        // Tool shortcuts
        if (e.key === 'b' || e.key === 'B') {
            this.selectTool('boundingbox');
        } else if (e.key === 'p' || e.key === 'P') {
            this.selectTool('polygon');
        } else if (e.key === 'o' || e.key === 'O') {
            this.selectTool('point');
        } else if (e.key === 'l' || e.key === 'L') {
            this.selectTool('polyline');
        } else if (e.key === 'k' || e.key === 'K') {
            this.selectTool('keypoint');
        } else if (e.key === 'm' || e.key === 'M') {
            this.selectTool('mask');
        } else if (e.key === 'r' || e.key === 'R') {
            this.selectTool('pose');
        }
        
        // Cancel drawing or deselect annotations
        if (e.key === 'Escape') {
            if (this.isDrawingBoundingBox || this.isPolygonDrawing || this.isPolylineDrawing || this.isPoseDrawing) {
                // Cancel drawing if currently drawing
                this.cancelDrawing();
            } else if (this.selectedAnnotations.size > 0) {
                // Deselect annotations if any are selected
                this.selectedAnnotations.clear();
                
                // Smooth redraw without flickering
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                if (this.cachedImage) {
                    this.drawCachedImage();
                }
                this.drawAnnotations();
                
                console.log('✅ Annotations deselected with ESC');
            }
        }
        
        // Delete selected
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelected();
        }
        
        // Finish polygon/polyline
        if (e.key === 'Enter') {
            if (this.isPolygonDrawing) {
                this.finishPolygon();
            } else if (this.isPolylineDrawing) {
                this.finishPolyline();
            }
        }
        
        // Image navigation shortcuts
        if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
            this.previousImage();
        } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
            this.nextImage();
        }
        
        // Zoom shortcuts
        if (e.key === '=' || e.key === '+') {
            if (e.ctrlKey || e.metaKey) {
                this.zoomIn();
            }
        } else if (e.key === '-') {
            if (e.ctrlKey || e.metaKey) {
                this.zoomOut();
            }
        } else if (e.key === '0') {
            if (e.ctrlKey || e.metaKey) {
                this.fitToScreen();
            }
        } else if (e.key === '1' && (e.ctrlKey || e.metaKey)) {
            this.actualSize();
        }
        
        // Fit to screen shortcut
        if (e.key === 'f' || e.key === 'F') {
            this.fitToScreen();
        }
        
        // Mask paint brush size controls
        if (e.key === '[') {
            this.maskBrushSize = Math.max(5, this.maskBrushSize - 5);
            NotificationManager.info(`Brush size: ${this.maskBrushSize}px`);
        } else if (e.key === ']') {
            this.maskBrushSize = Math.min(100, this.maskBrushSize + 5);
            NotificationManager.info(`Brush size: ${this.maskBrushSize}px`);
        }
        
        // Annotation management shortcuts
        if (e.key === 'd' || e.key === 'D') {
            if (e.ctrlKey || e.metaKey) {
                this.duplicateSelected();
            }
        } else if (e.key === 'a' || e.key === 'A') {
            if (e.ctrlKey || e.metaKey) {
                this.clearAllAnnotations();
            }
        }
    }
    
    // Helper method to check if key is a shortcut
    isShortcutKey(key) {
        const shortcuts = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'b', 'p', 'o', 'l', 'k', 'm', 'r', 'f', '[', ']'];
        return shortcuts.includes(key.toLowerCase());
    }
    
    // Image navigation methods
    previousImage() {
        if (this.currentImageIndex > 0) {
            this.uiManager.setCurrentImage(this.currentImageIndex - 1);
        }
    }
    
    nextImage() {
        if (this.currentImageIndex < this.images.length - 1) {
            this.uiManager.setCurrentImage(this.currentImageIndex + 1);
        }
    }

    cancelDrawing() {
        console.log('🚫 Canceling drawing...');
        this.isDrawingBoundingBox = false;
        this.currentBoundingBox = null;
        this.cancelPolygon();
        this.cancelPolyline();
        this.cancelMaskPaint();
        this.cancelPoseDrawing();
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
    }

    deleteSelected() {
        if (this.selectedAnnotations.size === 0) return;
        
        const imagePath = this.currentImage.path;
        const annotations = this.annotations[imagePath] || [];
        
        // Store deleted annotations for history
        const deletedAnnotations = Array.from(this.selectedAnnotations);
        
        // Remove selected annotations
        this.selectedAnnotations.forEach(selectedAnnotation => {
            const index = annotations.findIndex(ann => ann === selectedAnnotation);
            if (index > -1) {
                annotations.splice(index, 1);
            }
        });
        
        // Save to history - save each annotation separately for proper undo/redo
        deletedAnnotations.forEach(annotation => {
            this.historyManager.saveToHistory('delete_annotation', {
                annotation: annotation
            });
        });
        
        this.selectedAnnotations.clear();
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
        
        console.log('🗑️ Selected annotations deleted');
        NotificationManager.success(`${deletedAnnotations.length} annotation(s) deleted`);
    }

    // ========== ZOOM METHODS ==========
    zoomIn() {
        this.canvasManager.zoomIn();
    }

    zoomOut() {
        this.canvasManager.zoomOut();
    }

    fitToScreen() {
        this.canvasManager.fitToScreen();
    }

    actualSize() {
        this.canvasManager.actualSize();
    }

    // ========== PROFESSIONAL ANNOTATION METHODS ==========
    getAnnotationAtPoint(x, y) {
        if (!this.currentImage) return null;
        
        const imagePath = this.currentImage.path;
        const annotations = this.annotations[imagePath] || [];
        
        // Convert canvas coordinates to image coordinates
        const imageCoords = this.canvasToImageCoords(x, y);
        
        // Check from last to first (top annotations first)
        for (let i = annotations.length - 1; i >= 0; i--) {
            const annotation = annotations[i];
            if (this.isPointInAnnotation(imageCoords.x, imageCoords.y, annotation)) {
                return annotation;
            }
        }
        return null;
    }

    isPointInAnnotation(x, y, annotation) {
        switch (annotation.type) {
            case 'boundingbox':
                // Add padding for easier selection
                const padding = 5;
                return x >= annotation.x - padding && x <= annotation.x + annotation.width + padding &&
                       y >= annotation.y - padding && y <= annotation.y + annotation.height + padding;
            case 'point':
                const distance = Math.sqrt((x - annotation.x) ** 2 + (y - annotation.y) ** 2);
                return distance <= 20; // 20px radius for easier selection
            case 'keypoint':
                // Keypoint selection with larger radius for easier selection
                const keypointDistance = Math.sqrt((x - annotation.x) ** 2 + (y - annotation.y) ** 2);
                return keypointDistance <= 25; // 25px radius for easier selection
            case 'pose':
                // Check if point is near any pose keypoint
                if (annotation.keypoints) {
                    for (const keypoint of annotation.keypoints) {
                        const poseDistance = Math.sqrt((x - keypoint.x) ** 2 + (y - keypoint.y) ** 2);
                        if (poseDistance <= 25) { // 25px radius for easier selection
                            return true;
                        }
                    }
                }
                return false;
            case 'polygon':
                // Check if point is inside polygon or near polygon edges
                return this.isPointInPolygon(x, y, annotation.points) || this.isPointNearPolygon(x, y, annotation.points);
            case 'polyline':
                // Check if point is near polyline edges
                return this.isPointNearPolyline(x, y, annotation.points);
            case 'maskpaint':
                // Check if point is near mask paint strokes
                return this.isPointNearMaskPaint(x, y, annotation);
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

    isPointNearPolygon(x, y, points) {
        const threshold = 10; // 10px threshold for easier selection
        
        // Check distance to each edge
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            
            // Calculate distance from point to line segment
            const distance = this.distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            if (distance <= threshold) {
                return true;
            }
        }
        
        return false;
    }

    isPointNearPolyline(x, y, points) {
        const threshold = 10; // 10px threshold for easier selection
        
        // Check distance to each edge
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Calculate distance from point to line segment
            const distance = this.distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            if (distance <= threshold) {
                return true;
            }
        }
        
        return false;
    }

    isPointNearMaskPaint(x, y, annotation) {
        if (!annotation.points || annotation.points.length < 2) return false;
        
        const threshold = 15; // 15px threshold for mask paint selection
        
        // Check distance to each stroke segment
        for (let i = 0; i < annotation.points.length - 1; i++) {
            const p1 = annotation.points[i];
            const p2 = annotation.points[i + 1];
            
            // Calculate distance from point to line segment
            const distance = this.distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            if (distance <= threshold) {
                return true;
            }
        }
        
        return false;
    }

    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getResizeHandleAt(x, y) {
        if (this.selectedAnnotations.size !== 1) return null;
        
        const annotation = Array.from(this.selectedAnnotations)[0];
        
        // Convert canvas coordinates to image coordinates
        const imageCoords = this.canvasToImageCoords(x, y);
        
        if (annotation.type === 'boundingbox') {
            const handles = this.getBoundingBoxHandles(annotation);
            for (const handle of handles) {
                // Convert handle coordinates to canvas coordinates for comparison
                const handleCanvasCoords = this.imageToCanvasCoords(handle.x, handle.y);
                // Increased sensitivity for easier handle selection
                if (Math.abs(x - handleCanvasCoords.x) <= 12 && Math.abs(y - handleCanvasCoords.y) <= 12) {
                    return handle;
                }
            }
        } else if (annotation.type === 'polygon') {
            const handles = this.getPolygonHandles(annotation);
            for (const handle of handles) {
                // Convert handle coordinates to canvas coordinates for comparison
                const handleCanvasCoords = this.imageToCanvasCoords(handle.x, handle.y);
                // Increased sensitivity for easier handle selection
                if (Math.abs(x - handleCanvasCoords.x) <= 12 && Math.abs(y - handleCanvasCoords.y) <= 12) {
                    return handle;
                }
            }
        } else if (annotation.type === 'point') {
            // Point doesn't have resize handles, but we can add move handle
            const distance = Math.sqrt((imageCoords.x - annotation.x) ** 2 + (imageCoords.y - annotation.y) ** 2);
            if (distance <= 12) {
                return { x: annotation.x, y: annotation.y, type: 'move' };
            }
        } else if (annotation.type === 'polyline') {
            const handles = this.getPolylineHandles(annotation);
            for (const handle of handles) {
                // Convert handle coordinates to canvas coordinates for comparison
                const handleCanvasCoords = this.imageToCanvasCoords(handle.x, handle.y);
                // Increased sensitivity for easier handle selection
                if (Math.abs(x - handleCanvasCoords.x) <= 12 && Math.abs(y - handleCanvasCoords.y) <= 12) {
                    return handle;
                }
            }
        } else if (annotation.type === 'keypoint') {
            // Keypoint doesn't have resize handles, but we can add move handle
            const distance = Math.sqrt((imageCoords.x - annotation.x) ** 2 + (imageCoords.y - annotation.y) ** 2);
            if (distance <= 12) {
                return { x: annotation.x, y: annotation.y, type: 'move' };
            }
        } else if (annotation.type === 'pose') {
            // Check each pose keypoint for handle
            if (annotation.keypoints) {
                for (let i = 0; i < annotation.keypoints.length; i++) {
                    const kp = annotation.keypoints[i];
                    const handleCanvasCoords = this.imageToCanvasCoords(kp.x, kp.y);
                    if (Math.abs(x - handleCanvasCoords.x) <= 12 && Math.abs(y - handleCanvasCoords.y) <= 12) {
                        return { x: kp.x, y: kp.y, type: 'move', keypointIndex: i };
                    }
                }
            }
        }
        
        return null;
    }

    getBoundingBoxHandles(annotation) {
        const handles = [];
        const { x, y, width, height } = annotation;
        
        // Corner handles
        handles.push({ x, y, type: 'nw-resize' });
        handles.push({ x: x + width, y, type: 'ne-resize' });
        handles.push({ x, y: y + height, type: 'sw-resize' });
        handles.push({ x: x + width, y: y + height, type: 'se-resize' });
        
        // Edge handles
        handles.push({ x: x + width / 2, y, type: 'n-resize' });
        handles.push({ x: x + width, y: y + height / 2, type: 'e-resize' });
        handles.push({ x: x + width / 2, y: y + height, type: 's-resize' });
        handles.push({ x, y: y + height / 2, type: 'w-resize' });
        
        return handles;
    }

    getPolygonHandles(annotation) {
        const handles = [];
        
        // Add handles for each vertex
        annotation.points.forEach((point, index) => {
            handles.push({
                x: point.x,
                y: point.y,
                type: 'move',
                vertexIndex: index
            });
        });
        
        return handles;
    }

    getPolylineHandles(annotation) {
        const handles = [];
        
        // Add handles for each vertex
        annotation.points.forEach((point, index) => {
            handles.push({
                x: point.x,
                y: point.y,
                type: 'move',
                vertexIndex: index
            });
        });
        
        return handles;
    }

    selectAnnotation(annotation) {
        this.selectedAnnotations.clear();
        this.selectedAnnotations.add(annotation);
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
        
        console.log('✅ Annotation selected:', annotation);
    }

    toggleAnnotationSelection(annotation) {
        if (this.selectedAnnotations.has(annotation)) {
            this.selectedAnnotations.delete(annotation);
        } else {
            this.selectedAnnotations.add(annotation);
        }
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
        
        console.log('✅ Annotation selection toggled:', annotation);
    }

    updateCursor(x, y) {
        // Don't change cursor while drawing
        if (this.isDrawingBoundingBox || this.isPolygonDrawing || this.isPolylineDrawing) {
            this.canvas.style.cursor = 'crosshair';
            return;
        }
        
        const resizeHandle = this.getResizeHandleAt(x, y);
        const annotation = this.getAnnotationAtPoint(x, y);
        
        if (resizeHandle) {
            this.canvas.style.cursor = resizeHandle.type;
        } else if (annotation) {
            this.canvas.style.cursor = 'pointer'; // Hand cursor for annotations
        } else if (this.selectedTool === 'boundingbox') {
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    updateDragging(x, y) {
        if (!this.dragStart) return;
        
        // Simple approach: calculate delta in canvas coordinates
        const deltaX = x - this.dragStart.x;
        const deltaY = y - this.dragStart.y;
        
        // Convert delta to image coordinates using zoom factor only
        const zoom = this.canvasManager.getZoom();
        const dx = deltaX / zoom;
        const dy = deltaY / zoom;
        
        this.selectedAnnotations.forEach(annotation => {
            // Update position in image coordinates
            annotation.x += dx;
            annotation.y += dy;
            
            // Keep within image bounds
            if (annotation.type === 'boundingbox') {
                annotation.x = Math.max(0, Math.min(annotation.x, this.currentImage.originalWidth - annotation.width));
                annotation.y = Math.max(0, Math.min(annotation.y, this.currentImage.originalHeight - annotation.height));
            } else if (annotation.type === 'point') {
                annotation.x = Math.max(0, Math.min(annotation.x, this.currentImage.originalWidth));
                annotation.y = Math.max(0, Math.min(annotation.y, this.currentImage.originalHeight));
            } else if (annotation.type === 'polygon') {
                annotation.points.forEach(point => {
                    point.x = Math.max(0, Math.min(point.x, this.currentImage.originalWidth));
                    point.y = Math.max(0, Math.min(point.y, this.currentImage.originalHeight));
                });
            } else if (annotation.type === 'polyline') {
                annotation.points.forEach(point => {
                    point.x = Math.max(0, Math.min(point.x, this.currentImage.originalWidth));
                    point.y = Math.max(0, Math.min(point.y, this.currentImage.originalHeight));
                });
            } else if (annotation.type === 'keypoint') {
                annotation.x = Math.max(0, Math.min(annotation.x, this.currentImage.originalWidth));
                annotation.y = Math.max(0, Math.min(annotation.y, this.currentImage.originalHeight));
            } else if (annotation.type === 'pose') {
                // Move all pose keypoints together
                if (annotation.keypoints) {
                    annotation.keypoints.forEach(kp => {
                        kp.x = Math.max(0, Math.min(kp.x, this.currentImage.originalWidth));
                        kp.y = Math.max(0, Math.min(kp.y, this.currentImage.originalHeight));
                    });
                }
            }
        });
        
        // Update drag start to current position for next frame
        this.dragStart = { x, y };
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
    }

    updateResizing(x, y) {
        if (!this.resizeHandle || this.selectedAnnotations.size !== 1) return;
        
        const annotation = Array.from(this.selectedAnnotations)[0];
        
        // Simple approach: calculate delta in canvas coordinates
        const deltaX = x - this.dragStart.x;
        const deltaY = y - this.dragStart.y;
        
        // Convert delta to image coordinates using zoom factor only
        const zoom = this.canvasManager.getZoom();
        const dx = deltaX / zoom;
        const dy = deltaY / zoom;
        
        if (annotation.type === 'boundingbox') {
            switch (this.resizeHandle.type) {
                case 'nw-resize':
                    annotation.x += dx;
                    annotation.y += dy;
                    annotation.width -= dx;
                    annotation.height -= dy;
                    break;
                case 'ne-resize':
                    annotation.y += dy;
                    annotation.width += dx;
                    annotation.height -= dy;
                    break;
                case 'sw-resize':
                    annotation.x += dx;
                    annotation.width -= dx;
                    annotation.height += dy;
                    break;
                case 'se-resize':
                    annotation.width += dx;
                    annotation.height += dy;
                    break;
                case 'n-resize':
                    annotation.y += dy;
                    annotation.height -= dy;
                    break;
                case 'e-resize':
                    annotation.width += dx;
                    break;
                case 's-resize':
                    annotation.height += dy;
                    break;
                case 'w-resize':
                    annotation.x += dx;
                    annotation.width -= dx;
                    break;
            }
            
            // Keep within image bounds
            annotation.x = Math.max(0, Math.min(annotation.x, this.currentImage.originalWidth - annotation.width));
            annotation.y = Math.max(0, Math.min(annotation.y, this.currentImage.originalHeight - annotation.height));
            annotation.width = Math.max(10, Math.min(annotation.width, this.currentImage.originalWidth - annotation.x));
            annotation.height = Math.max(10, Math.min(annotation.height, this.currentImage.originalHeight - annotation.y));
        } else if (annotation.type === 'polygon' && this.resizeHandle.type === 'move') {
            // Move polygon vertex
            const vertexIndex = this.resizeHandle.vertexIndex;
            if (vertexIndex !== undefined && annotation.points[vertexIndex]) {
                annotation.points[vertexIndex].x += dx;
                annotation.points[vertexIndex].y += dy;
                
                // Keep within image bounds
                annotation.points[vertexIndex].x = Math.max(0, Math.min(annotation.points[vertexIndex].x, this.currentImage.originalWidth));
                annotation.points[vertexIndex].y = Math.max(0, Math.min(annotation.points[vertexIndex].y, this.currentImage.originalHeight));
            }
        } else if (annotation.type === 'point' && this.resizeHandle.type === 'move') {
            // Move point
            annotation.x += dx;
            annotation.y += dy;
            
            // Keep within image bounds
            annotation.x = Math.max(0, Math.min(annotation.x, this.currentImage.originalWidth));
            annotation.y = Math.max(0, Math.min(annotation.y, this.currentImage.originalHeight));
        } else if (annotation.type === 'polyline' && this.resizeHandle.type === 'move') {
            // Move polyline vertex
            const vertexIndex = this.resizeHandle.vertexIndex;
            if (vertexIndex !== undefined && annotation.points[vertexIndex]) {
                annotation.points[vertexIndex].x += dx;
                annotation.points[vertexIndex].y += dy;
                
                // Keep within image bounds
                annotation.points[vertexIndex].x = Math.max(0, Math.min(annotation.points[vertexIndex].x, this.currentImage.originalWidth));
                annotation.points[vertexIndex].y = Math.max(0, Math.min(annotation.points[vertexIndex].y, this.currentImage.originalHeight));
            }
        } else if (annotation.type === 'keypoint' && this.resizeHandle.type === 'move') {
            // Move keypoint
            annotation.x += dx;
            annotation.y += dy;
            
            // Keep within image bounds
            annotation.x = Math.max(0, Math.min(annotation.x, this.currentImage.originalWidth));
            annotation.y = Math.max(0, Math.min(annotation.y, this.currentImage.originalHeight));
        } else if (annotation.type === 'pose' && this.resizeHandle.type === 'move') {
            // Move individual pose keypoint
            const keypointIndex = this.resizeHandle.keypointIndex;
            if (keypointIndex !== undefined && annotation.keypoints && annotation.keypoints[keypointIndex]) {
                annotation.keypoints[keypointIndex].x += dx;
                annotation.keypoints[keypointIndex].y += dy;
                
                // Keep within image bounds
                annotation.keypoints[keypointIndex].x = Math.max(0, Math.min(annotation.keypoints[keypointIndex].x, this.currentImage.originalWidth));
                annotation.keypoints[keypointIndex].y = Math.max(0, Math.min(annotation.keypoints[keypointIndex].y, this.currentImage.originalHeight));
            }
        }
        
        this.dragStart = { x, y };
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
    }

    finishDragging() {
        console.log('✅ Dragging finished');
        
        // Store original positions before move for history
        const imagePath = this.currentImage.path;
        const annotations = this.annotations[imagePath] || [];
        
        // Save to history - store original positions
        this.historyManager.saveToHistory('move_annotation', {
            annotations: Array.from(this.selectedAnnotations)
        });
        
        NotificationManager.success('Annotation(s) moved');
    }

    finishResizing() {
        console.log('✅ Resizing finished');
        
        // Store original sizes before resize for history
        const imagePath = this.currentImage.path;
        const annotations = this.annotations[imagePath] || [];
        
        // Save to history - store original sizes
        this.historyManager.saveToHistory('resize_annotation', {
            annotations: Array.from(this.selectedAnnotations)
        });
        
        NotificationManager.success('Annotation(s) resized');
    }

    // ========== POLYGON METHODS ==========
    addPolygonPoint(x, y) {
        // Check if label is selected first
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot start polygon');
            NotificationManager.error('Please select a label first');
            return;
        }
        
        if (!this.isPolygonDrawing) {
            // Start new polygon
            this.isPolygonDrawing = true;
            this.currentPolygon = {
                type: 'polygon',
                points: [{ x, y }],
                label: this.selectedLabel,
                color: this.getLabelColor(this.selectedLabel)
            };
            console.log('🔺 Starting polygon at:', { x, y });
        } else {
            // Check if clicking near the first point to close polygon
            const startPoint = this.currentPolygon.points[0];
            const distanceToStart = Math.sqrt((x - startPoint.x) ** 2 + (y - startPoint.y) ** 2);
            const closeThreshold = 20; // 20px threshold for closing
            
            if (this.currentPolygon.points.length >= 2 && distanceToStart <= closeThreshold) {
                // Close the polygon
                console.log('🔺 Closing polygon');
                this.finishPolygon();
                return;
            } else {
                // Add point to existing polygon
                this.currentPolygon.points.push({ x, y });
                console.log('🔺 Added polygon point:', { x, y });
            }
        }
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
    }

    updatePolygonPreview(x, y) {
        if (!this.currentPolygon) return;
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
        // Pass image coordinates directly to drawPolygonPreview
        this.drawPolygonPreview(x, y);
    }

    drawPolygonPreview(x, y) {
        if (!this.currentPolygon || this.currentPolygon.points.length === 0) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        // Apply zoom and pan transformations like in drawAnnotations
        const zoom = this.canvasManager.getZoom();
        const pan = this.canvasManager.getPan();
        
        // Calculate image center position
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.cachedImage.naturalWidth;
        const imageHeight = this.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Apply transformations to annotation coordinates
        ctx.translate(centerX + pan.x, centerY + pan.y);
        ctx.scale(zoom, zoom);
        
        // Check if mouse is near the first point (for closing polygon)
        const startPoint = this.currentPolygon.points[0];
        const distanceToStart = Math.sqrt((x - startPoint.x) ** 2 + (y - startPoint.y) ** 2);
        const closeThreshold = 20; // 20px threshold for closing
        
        if (this.currentPolygon.points.length >= 2 && distanceToStart <= closeThreshold) {
            // Draw closing line in red when near start point
            ctx.strokeStyle = '#FF3B30';
            ctx.lineWidth = 3 / zoom; // Adjust line width for zoom
            ctx.setLineDash([]); // Solid line for closing
        } else {
            // Draw normal preview line
            ctx.strokeStyle = this.currentPolygon.color;
            ctx.lineWidth = 2 / zoom; // Adjust line width for zoom
            ctx.setLineDash([8 / zoom, 4 / zoom]); // Adjust dash for zoom
        }
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        
        for (let i = 1; i < this.currentPolygon.points.length; i++) {
            const point = this.currentPolygon.points[i];
            ctx.lineTo(point.x, point.y);
        }
        
        // Draw line to current mouse position (x, y are already in image coordinates)
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // Draw existing points
        ctx.fillStyle = this.currentPolygon.color;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        this.currentPolygon.points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });
        
        // Draw "Click to close" indicator when near start point
        if (this.currentPolygon.points.length >= 2 && distanceToStart <= closeThreshold) {
            ctx.fillStyle = '#FF3B30';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(startPoint.x, startPoint.y, 10, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Draw "Click to close" text
            ctx.fillStyle = '#FF3B30';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Click to close', startPoint.x, startPoint.y - 20);
        }
        
        ctx.restore();
    }

    finishPolygon() {
        if (!this.currentPolygon || this.currentPolygon.points.length < 3) {
            console.log('❌ Polygon needs at least 3 points');
            return;
        }
        
        // Check if label is selected
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot create polygon');
            NotificationManager.error('Please select a label first');
            this.cancelPolygon();
            return;
        }
        
        this.currentPolygon.label = this.selectedLabel;
        this.currentPolygon.color = this.getLabelColor(this.selectedLabel);
        
        this.addAnnotation(this.currentPolygon);
        this.cancelPolygon();
        console.log('✅ Polygon finished:', this.currentPolygon);
    }

    cancelPolygon() {
        this.isPolygonDrawing = false;
        this.currentPolygon = null;
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
    }

    // ========== POLYLINE METHODS ==========
    addPolylinePoint(x, y) {
        // Check if label is selected first
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot start polyline');
            NotificationManager.error('Please select a label first');
            return;
        }
        
        if (!this.isPolylineDrawing) {
            // Start new polyline
            this.isPolylineDrawing = true;
            this.currentPolyline = {
                type: 'polyline',
                points: [{ x, y }],
                label: this.selectedLabel,
                color: this.getLabelColor(this.selectedLabel)
            };
            console.log('📏 Starting polyline at:', { x, y });
        } else {
            // Check for double-click to finish polyline
            const lastPoint = this.currentPolyline.points[this.currentPolyline.points.length - 1];
            const distanceToLast = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
            const doubleClickThreshold = 15; // 15px threshold for double-click
            
            if (this.currentPolyline.points.length >= 2 && distanceToLast <= doubleClickThreshold) {
                // Finish polyline on double-click
                console.log('📏 Finishing polyline with double-click');
                this.finishPolyline();
                return;
            } else {
                // Add point to existing polyline
                this.currentPolyline.points.push({ x, y });
                console.log('📏 Added polyline point:', { x, y });
            }
        }
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
    }

    updatePolylinePreview(x, y) {
        if (!this.currentPolyline) return;
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
        this.drawPolylinePreview(x, y);
    }

    drawPolylinePreview(x, y) {
        if (!this.currentPolyline || this.currentPolyline.points.length === 0) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        // Apply zoom and pan transformations like in drawAnnotations
        const zoom = this.canvasManager.getZoom();
        const pan = this.canvasManager.getPan();
        
        // Calculate image center position
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.cachedImage.naturalWidth;
        const imageHeight = this.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Apply transformations to annotation coordinates
        ctx.translate(centerX + pan.x, centerY + pan.y);
        ctx.scale(zoom, zoom);
        
        // Check if mouse is near the last point (for double-click finish)
        const lastPoint = this.currentPolyline.points[this.currentPolyline.points.length - 1];
        const distanceToLast = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
        const doubleClickThreshold = 15; // 15px threshold for double-click
        
        if (this.currentPolyline.points.length >= 2 && distanceToLast <= doubleClickThreshold) {
            // Draw finishing line in red when near last point
            ctx.strokeStyle = '#FF3B30';
            ctx.lineWidth = 3 / zoom; // Adjust line width for zoom
            ctx.setLineDash([]); // Solid line for finishing
        } else {
            // Draw normal preview line
            ctx.strokeStyle = this.currentPolyline.color;
            ctx.lineWidth = 2 / zoom; // Adjust line width for zoom
            ctx.setLineDash([8 / zoom, 4 / zoom]); // Adjust dash for zoom
        }
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        const startPoint = this.currentPolyline.points[0];
        ctx.moveTo(startPoint.x, startPoint.y);
        
        for (let i = 1; i < this.currentPolyline.points.length; i++) {
            const point = this.currentPolyline.points[i];
            ctx.lineTo(point.x, point.y);
        }
        
        // Draw line to current mouse position (x, y are already in image coordinates)
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // Draw existing points with professional styling
        ctx.fillStyle = this.currentPolyline.color;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        this.currentPolyline.points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });
        
        // Draw "Double-click to finish" indicator when near last point
        if (this.currentPolyline.points.length >= 2 && distanceToLast <= doubleClickThreshold) {
            ctx.fillStyle = '#FF3B30';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(lastPoint.x, lastPoint.y, 10, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Draw "Double-click to finish" text
            ctx.fillStyle = '#FF3B30';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Double-click to finish', lastPoint.x, lastPoint.y - 20);
        }
        
        ctx.restore();
    }

    finishPolyline() {
        if (!this.currentPolyline || this.currentPolyline.points.length < 2) {
            console.log('❌ Polyline needs at least 2 points');
            return;
        }
        
        // Check if label is selected
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot create polyline');
            NotificationManager.error('Please select a label first');
            this.cancelPolyline();
            return;
        }
        
        this.currentPolyline.label = this.selectedLabel;
        this.currentPolyline.color = this.getLabelColor(this.selectedLabel);
        
        this.addAnnotation(this.currentPolyline);
        this.cancelPolyline();
        console.log('✅ Polyline finished:', this.currentPolyline);
    }

    cancelPolyline() {
        this.isPolylineDrawing = false;
        this.currentPolyline = null;
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
    }

    // ========== KEYPOINT METHODS ==========
    addKeypoint(x, y) {
        // Check if label is selected
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot create keypoint');
            NotificationManager.error('Please select a label first');
            return;
        }
        
        const keypoint = {
            type: 'keypoint',
            x: x,
            y: y,
            label: this.selectedLabel,
            color: this.getLabelColor(this.selectedLabel),
            id: Date.now() + Math.random() // Unique ID for keypoint
        };
        
        this.addAnnotation(keypoint);
        console.log('📍 Keypoint added:', keypoint);
        
        // Show success notification
        NotificationManager.success(`Keypoint "${this.selectedLabel}" added successfully`);
    }

    // ========== POSE/KEYPOINT METHODS ==========
    addPoseKeypoint(x, y) {
        // Check if label is selected
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot create pose keypoint');
            NotificationManager.error('Please select a label first');
            return;
        }
        
        // Debug current image state
        console.log('🔍 Adding pose keypoint to image:', this.currentImage?.path);
        console.log('🔍 Current image index:', this.currentImageIndex);
        
        // Initialize pose if not started (but don't show pop-up here)
        if (!this.isPoseDrawing) {
            this.poseTemplate = CONFIG.KEYPOINT_TEMPLATES[this.selectedLabel] || CONFIG.KEYPOINT_TEMPLATES['person'];
            this.poseKeypoints = [];
            this.isPoseDrawing = true;
            console.log('🎭 Starting pose drawing with template:', this.poseTemplate.name);
        }
        
        // Add keypoint to current pose
        const keypointIndex = this.poseKeypoints.length;
        if (keypointIndex < this.poseTemplate.points.length) {
            this.poseKeypoints.push({
                x: x,
                y: y,
                name: this.poseTemplate.points[keypointIndex],
                index: keypointIndex
            });
            
            console.log(`📍 Pose keypoint ${keypointIndex + 1}/${this.poseTemplate.points.length} added:`, this.poseTemplate.points[keypointIndex]);
            
            // Show notification for next keypoint
            const nextKeypointIndex = keypointIndex + 1;
            if (nextKeypointIndex < this.poseTemplate.points.length) {
                const nextKeypoint = this.poseTemplate.points[nextKeypointIndex];
                NotificationManager.info(`Next: Click on ${nextKeypoint} (${nextKeypointIndex + 1}/${this.poseTemplate.points.length})`);
            }
            
            // Check if pose is complete
            if (this.poseKeypoints.length === this.poseTemplate.points.length) {
                this.finishPose();
            }
        }
    }

    startPoseDrawing() {
        // Get pose template based on selected label
        this.poseTemplate = CONFIG.KEYPOINT_TEMPLATES[this.selectedLabel] || CONFIG.KEYPOINT_TEMPLATES['person'];
        this.poseKeypoints = [];
        this.isPoseDrawing = true;
        
        console.log('🎭 Starting pose drawing with template:', this.poseTemplate.name);
        
        // Don't show pop-up, use notification system instead
        console.log('🎭 Pose drawing started, using notification system');
    }

    finishPose() {
        if (!this.isPoseDrawing || this.poseKeypoints.length === 0) {
            console.log('❌ No pose to finish');
            return;
        }
        
        // Debug current image state
        console.log('🔍 Finishing pose for image:', this.currentImage?.path);
        console.log('🔍 Current image index:', this.currentImageIndex);
        console.log('🔍 Images array length:', this.images.length);
        
        const poseAnnotation = {
            type: 'pose',
            keypoints: [...this.poseKeypoints],
            template: this.poseTemplate.name,
            label: this.selectedLabel,
            color: this.getLabelColor(this.selectedLabel),
            connections: this.poseTemplate.connections
        };
        
        this.addAnnotation(poseAnnotation);
        console.log('🎭 Pose finished:', poseAnnotation);
        
        // Show success notification
        NotificationManager.success(`🎭 Pose "${this.selectedLabel}" completed! All 17 keypoints added successfully`);
        
        this.cancelPoseDrawing();
    }

    cancelPoseDrawing() {
        console.log('🚫 Canceling pose drawing...');
        
        // If we have a current pose being drawn, remove it from annotations
        if (this.currentPose && this.currentPose.keypoints && this.currentPose.keypoints.length > 0) {
            const imagePath = this.currentImage.path;
            const annotations = this.annotations[imagePath] || [];
            
            // Find and remove the current pose annotation
            const poseIndex = annotations.findIndex(ann => ann === this.currentPose);
            if (poseIndex > -1) {
                annotations.splice(poseIndex, 1);
                console.log('🗑️ Removed incomplete pose annotation');
            }
        }
        
        this.isPoseDrawing = false;
        this.currentPose = null;
        this.poseTemplate = null;
        this.poseKeypoints = [];
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
        
        console.log('✅ Pose drawing canceled');
    }

    updatePosePreview(x, y) {
        if (!this.isPoseDrawing) return;
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
        this.drawPosePreview(x, y);
    }

    drawPosePreview(x, y) {
        if (!this.isPoseDrawing || !this.poseTemplate) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        // Draw existing keypoints
        ctx.fillStyle = this.getLabelColor(this.selectedLabel);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        this.poseKeypoints.forEach((keypoint, index) => {
            // Convert image coordinates to canvas coordinates
            const canvasCoords = this.imageToCanvasCoords(keypoint.x, keypoint.y);
            
            // Draw keypoint circle
            ctx.beginPath();
            ctx.arc(canvasCoords.x, canvasCoords.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Draw keypoint name (shortened) instead of number
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            const shortName = this.shortenKeypointName(keypoint.name);
            ctx.fillText(shortName, canvasCoords.x, canvasCoords.y + 3);
            ctx.fillStyle = this.getLabelColor(this.selectedLabel);
        });
        
        // Draw current keypoint preview with name
        if (this.poseKeypoints.length < this.poseTemplate.points.length) {
            const currentKeypointName = this.poseTemplate.points[this.poseKeypoints.length];
            
            // Draw preview keypoint
            ctx.fillStyle = this.getLabelColor(this.selectedLabel);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Draw keypoint name (shortened) instead of number
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            const shortName = this.shortenKeypointName(currentKeypointName);
            ctx.fillText(shortName, x, y + 4);
        }
        
        // Draw skeleton connections
        ctx.strokeStyle = this.getLabelColor(this.selectedLabel);
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        
        this.poseTemplate.connections.forEach(connection => {
            const [startIndex, endIndex] = connection;
            const startPoint = this.poseKeypoints[startIndex];
            const endPoint = this.poseKeypoints[endIndex];
            
            if (startPoint && endPoint) {
                // Convert image coordinates to canvas coordinates for drawing
                const startCanvasCoords = this.imageToCanvasCoords(startPoint.x, startPoint.y);
                const endCanvasCoords = this.imageToCanvasCoords(endPoint.x, endPoint.y);
                
                ctx.beginPath();
                ctx.moveTo(startCanvasCoords.x, startCanvasCoords.y);
                ctx.lineTo(endCanvasCoords.x, endCanvasCoords.y);
                ctx.stroke();
            }
        });
        
        // Draw progress text with current keypoint name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        
        const currentKeypointIndex = this.poseKeypoints.length;
        const currentKeypointName = this.poseTemplate.points[currentKeypointIndex];
        
        // Draw progress
        ctx.fillText(`${this.poseKeypoints.length}/${this.poseTemplate.points.length} keypoints placed`, 10, 30);
        
        // Draw current keypoint instruction with better visibility
        if (currentKeypointName) {
            // Draw background for better visibility
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(8, 45, 200, 25);
            
            // Draw bright text
            ctx.fillStyle = '#00FF00'; // Bright green for better visibility
            ctx.font = 'bold 16px Arial';
            ctx.fillText(`Next: ${currentKeypointName}`, 10, 62);
        }
        
        // Draw completion message
        if (this.poseKeypoints.length === this.poseTemplate.points.length) {
            ctx.fillStyle = '#34C759'; // Green color for completion
            ctx.font = '16px Arial';
            ctx.fillText('✅ Pose completed!', 10, 50);
        }
        
        ctx.restore();
    }

    // ========== POSE TEMPLATE SELECTOR METHODS ==========
    showPoseTemplateSelector() {
        // Hide normal labels
        const labelsContainer = document.getElementById('labelsContainer');
        if (labelsContainer) {
            labelsContainer.style.display = 'none';
        }
        
        // Show pose template selector
        let poseSelector = document.getElementById('poseTemplateSelector');
        if (!poseSelector) {
            poseSelector = this.createPoseTemplateSelector();
        }
        poseSelector.style.display = 'block';
        
        console.log('🎭 Pose template selector shown');
    }

    hidePoseTemplateSelector() {
        // Show normal labels
        const labelsContainer = document.getElementById('labelsContainer');
        if (labelsContainer) {
            labelsContainer.style.display = 'block';
        }
        
        // Hide pose template selector
        const poseSelector = document.getElementById('poseTemplateSelector');
        if (poseSelector) {
            poseSelector.style.display = 'none';
        }
        
        console.log('🎭 Pose template selector hidden');
    }

    createPoseTemplateSelector() {
        // Get existing selector from HTML
        const selector = document.getElementById('poseTemplateSelector');
        if (!selector) return null;
        
        // Add event listeners
        selector.querySelectorAll('.pose-template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.currentTarget.dataset.template;
                this.selectPoseTemplate(template);
            });
        });
        
        return selector;
    }

    selectPoseTemplate(templateName) {
        this.selectedPoseTemplate = templateName;
        this.selectedLabel = templateName; // Use template name as label
        
        // Update UI
        document.querySelectorAll('.pose-template-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-template="${templateName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        console.log('🎭 Pose template selected:', templateName);
        NotificationManager.success(`${CONFIG.KEYPOINT_TEMPLATES[templateName].name} selected`);
    }

    showPoseInstructions() {
        console.log('🎭 showPoseInstructions called');
        
        // Check if user has disabled instructions
        const instructionsDisabled = localStorage.getItem('poseInstructionsDisabled') === 'true';
        if (instructionsDisabled) {
            console.log('🎭 Instructions disabled by user');
            return;
        }
        
        // Create instruction overlay
        let instructionOverlay = document.getElementById('poseInstructionOverlay');
        if (!instructionOverlay) {
            instructionOverlay = document.createElement('div');
            instructionOverlay.id = 'poseInstructionOverlay';
            instructionOverlay.className = 'pose-instruction-overlay';
            document.body.appendChild(instructionOverlay);
        }
        
        instructionOverlay.innerHTML = `
            <div class="instruction-content">
                <h3>🎭 Pose Drawing Instructions</h3>
                <div class="instruction-steps">
                    <div class="step">
                        <span class="step-number">1</span>
                        <span class="step-text">First, click on the <strong>nose</strong> to start the pose</span>
                    </div>
                    <div class="step">
                        <span class="step-number">2</span>
                        <span class="step-text">Follow the on-screen guidance for each keypoint</span>
                    </div>
                    <div class="step">
                        <span class="step-number">3</span>
                        <span class="step-text">Complete all 17 keypoints to finish the pose</span>
                    </div>
                </div>
                <div class="instruction-actions">
                    <button class="instruction-close" onclick="this.closest('.pose-instruction-overlay').style.display='none'">Got it!</button>
                    <button class="instruction-dont-show" onclick="this.disableInstructions()">Don't show again</button>
                </div>
            </div>
        `;
        
        // Add event listener for "Don't show again" button
        const dontShowBtn = instructionOverlay.querySelector('.instruction-dont-show');
        dontShowBtn.onclick = () => {
            localStorage.setItem('poseInstructionsDisabled', 'true');
            instructionOverlay.style.display = 'none';
        };
        
        instructionOverlay.style.display = 'flex';
        console.log('🎭 Pop-up display set to flex');
    }

    shortenKeypointName(name) {
        // Shorten common keypoint names for better display
        const shortNames = {
            'nose': 'N',
            'left_eye': 'LE',
            'right_eye': 'RE',
            'left_ear': 'LEa',
            'right_ear': 'REa',
            'left_shoulder': 'LS',
            'right_shoulder': 'RS',
            'left_elbow': 'LEl',
            'right_elbow': 'REl',
            'left_wrist': 'LW',
            'right_wrist': 'RW',
            'left_hip': 'LH',
            'right_hip': 'RH',
            'left_knee': 'LK',
            'right_knee': 'RK',
            'left_ankle': 'LA',
            'right_ankle': 'RA',
            'left_mouth': 'LM',
            'right_mouth': 'RM',
            'wrist': 'W',
            'thumb_1': 'T1',
            'thumb_2': 'T2',
            'thumb_3': 'T3',
            'thumb_tip': 'TT',
            'index_1': 'I1',
            'index_2': 'I2',
            'index_3': 'I3',
            'index_tip': 'IT',
            'middle_1': 'M1',
            'middle_2': 'M2',
            'middle_3': 'M3',
            'middle_tip': 'MT',
            'ring_1': 'R1',
            'ring_2': 'R2',
            'ring_3': 'R3',
            'ring_tip': 'RT',
            'pinky_1': 'P1',
            'pinky_2': 'P2',
            'pinky_3': 'P3',
            'pinky_tip': 'PT'
        };
        
        return shortNames[name] || name.substring(0, 3).toUpperCase();
    }

    // ========== MASK PAINT METHODS ==========
    startMaskPaint(x, y) {
        // Check if label is selected
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot start mask paint');
            NotificationManager.error('Please select a label first');
            return;
        }
        
        this.isMaskPainting = true;
        this.maskPoints = [{ x, y }];
        this.maskBrushColor = this.getLabelColor(this.selectedLabel);
        
        console.log('🎨 Starting mask paint at:', { x, y });
        
        // Show mask paint instructions
        NotificationManager.info('🎨 Mask Paint: Hold and drag to paint, release to finish. Use [ ] to change brush size, right-drag to erase');
    }

    updateMaskPaint(x, y) {
        if (!this.isMaskPainting) return;
        
        // Add point to mask
        this.maskPoints.push({ x, y });
        
        // Redraw with zoom and pan
        this.redrawCanvas();
        this.drawMaskPaintPreview();
        
        console.log('🎨 Mask paint point added:', { x, y, totalPoints: this.maskPoints.length, isErasing: this.isErasing });
    }

    drawMaskPaintPreview() {
        if (!this.isMaskPainting || this.maskPoints.length === 0) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        // Get zoom and pan values
        const zoom = this.canvasManager.getZoom();
        const pan = this.canvasManager.getPan();
        
        // Calculate image center position
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.cachedImage.naturalWidth;
        const imageHeight = this.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Apply transformations
        ctx.translate(centerX + pan.x, centerY + pan.y);
        ctx.scale(zoom, zoom);
        
        // Professional mask paint strokes
        ctx.strokeStyle = this.maskBrushColor;
        ctx.lineWidth = this.maskBrushSize / zoom; // Adjust line width for zoom
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = this.maskBrushOpacity;
        
        // Draw smooth brush strokes
        if (this.maskPoints.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(this.maskPoints[0].x, this.maskPoints[0].y);
            
            // Use quadratic curves for smoother strokes
            for (let i = 1; i < this.maskPoints.length - 1; i++) {
                const current = this.maskPoints[i];
                const next = this.maskPoints[i + 1];
                const midX = (current.x + next.x) / 2;
                const midY = (current.y + next.y) / 2;
                ctx.quadraticCurveTo(current.x, current.y, midX, midY);
            }
            
            // Draw to the last point
            const lastPoint = this.maskPoints[this.maskPoints.length - 1];
            ctx.lineTo(lastPoint.x, lastPoint.y);
            ctx.stroke();
        }
        
        // Draw brush preview at current position
        ctx.fillStyle = this.maskBrushColor;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(this.maskPoints[this.maskPoints.length - 1].x, this.maskPoints[this.maskPoints.length - 1].y, this.maskBrushSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw brush size indicator
        ctx.strokeStyle = this.isErasing ? '#FF0000' : '#00FF00';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(this.maskPoints[this.maskPoints.length - 1].x, this.maskPoints[this.maskPoints.length - 1].y, this.maskBrushSize / 2, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.restore();
    }

    finishMaskPaint() {
        if (!this.isMaskPainting || this.maskPoints.length < 2) {
            console.log('❌ Mask paint needs at least 2 points');
            this.cancelMaskPaint();
            return;
        }
        
        // Debug current image state
        console.log('🔍 Finishing mask paint for image:', this.currentImage?.path);
        console.log('🔍 Current image index:', this.currentImageIndex);
        console.log('🔍 Mask points count:', this.maskPoints.length);
        console.log('🔍 Is erasing:', this.isErasing);
        
        const maskAnnotation = {
            type: 'maskpaint',
            points: [...this.maskPoints],
            label: this.selectedLabel,
            color: this.maskBrushColor,
            brushSize: this.maskBrushSize,
            strokeCount: this.maskPoints.length,
            isErasing: this.isErasing,
            opacity: this.maskBrushOpacity
        };
        
        this.addAnnotation(maskAnnotation);
        console.log('🎨 Mask paint finished:', maskAnnotation);
        
        // Show success notification
        const action = this.isErasing ? 'erased' : 'painted';
        NotificationManager.success(`Mask ${action} "${this.selectedLabel}" completed successfully`);
        
        // Reset mask painting state
        this.isMaskPainting = false;
        this.maskPoints = [];
        this.isErasing = false;
        this.maskBrushColor = this.getLabelColor(this.selectedLabel);
        this.maskBrushOpacity = 0.7;
        
        // Redraw with zoom and pan
        this.redrawCanvas();
    }

    cancelMaskPaint() {
        this.isMaskPainting = false;
        this.maskPoints = [];
        this.isErasing = false;
        this.maskBrushColor = this.getLabelColor(this.selectedLabel);
        this.maskBrushOpacity = 0.7;
        
        console.log('🎨 Mask paint cancelled');
        
        // Redraw with zoom and pan
        this.redrawCanvas();
    }

    startBoundingBox(x, y) {
        // Check if label is selected first
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot start bounding box');
            NotificationManager.error('Please select a label first');
            return;
        }
        
        console.log('📦 Starting bounding box at:', { x, y });
        this.isDrawingBoundingBox = true;
        this.boundingBoxStart = { x, y };
        this.currentBoundingBox = { x, y, width: 0, height: 0 };
    }

    updateBoundingBox(x, y) {
        if (!this.isDrawingBoundingBox) return;
        
        this.currentBoundingBox = {
            x: Math.min(this.boundingBoxStart.x, x),
            y: Math.min(this.boundingBoxStart.y, y),
            width: Math.abs(x - this.boundingBoxStart.x),
            height: Math.abs(y - this.boundingBoxStart.y)
        };
        
        // Clear canvas and redraw everything smoothly (no flickering)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw cached image
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        
        // Redraw existing annotations
        this.drawAnnotations();
        
        // Draw current bounding box preview
        this.drawCurrentBoundingBox();
    }

    drawCachedImage() {
        if (!this.cachedImage) return;
        
        // Get zoom and pan values from canvas manager
        const zoom = this.canvasManager.getZoom();
        const pan = this.canvasManager.getPan();
        
        // Calculate image center position
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.cachedImage.naturalWidth;
        const imageHeight = this.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Apply pan offset
        const drawX = centerX + pan.x;
        const drawY = centerY + pan.y;
        
        // Draw image directly at calculated position
        this.ctx.drawImage(this.cachedImage, drawX, drawY, scaledWidth, scaledHeight);
    }

    finishBoundingBox() {
        if (!this.isDrawingBoundingBox) return;
        
        console.log('📦 Finishing bounding box:', this.currentBoundingBox);
        
        // Check if label is selected
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot create annotation');
            NotificationManager.error('Please select a label first');
            this.isDrawingBoundingBox = false;
            this.currentBoundingBox = null;
            return;
        }
        
        // Check minimum size (prevent single click annotations)
        if (this.currentBoundingBox.width < 10 || this.currentBoundingBox.height < 10) {
            console.log('❌ Bounding box too small, not creating annotation');
            this.isDrawingBoundingBox = false;
            this.currentBoundingBox = null;
            this.redrawCanvas();
            return;
        }
        
        // Add annotation
        const annotation = {
            type: 'boundingbox',
            x: this.currentBoundingBox.x,
            y: this.currentBoundingBox.y,
            width: this.currentBoundingBox.width,
            height: this.currentBoundingBox.height,
            label: this.selectedLabel,
            color: this.getLabelColor(this.selectedLabel)
        };
        
        this.addAnnotation(annotation);
        
        this.isDrawingBoundingBox = false;
        this.currentBoundingBox = null;
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
    }

    drawCurrentBoundingBox() {
        if (!this.currentBoundingBox || !this.selectedLabel) return;
        
        const ctx = this.ctx;
        ctx.save();
        
        // Get zoom and pan values
        const zoom = this.canvasManager.getZoom();
        const pan = this.canvasManager.getPan();
        
        // Calculate image center position
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.cachedImage.naturalWidth;
        const imageHeight = this.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Apply transformations
        ctx.translate(centerX + pan.x, centerY + pan.y);
        ctx.scale(zoom, zoom);
        
        // Adobe PS style: High quality bounding box preview
        const color = this.getLabelColor(this.selectedLabel);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 / zoom; // Adjust line width for zoom
        ctx.setLineDash([8 / zoom, 4 / zoom]); // Adjust dash for zoom
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Adobe PS style: Add subtle glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 3 / zoom;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw bounding box
        ctx.strokeRect(
            this.currentBoundingBox.x,
            this.currentBoundingBox.y,
            this.currentBoundingBox.width,
            this.currentBoundingBox.height
        );
        
        // Adobe PS style: Draw corner indicators with glow
        ctx.fillStyle = color;
        ctx.setLineDash([]); // Solid for corners
        const cornerSize = 8 / zoom; // Slightly larger corners like Adobe PS
        const { x, y, width, height } = this.currentBoundingBox;
        
        // Draw corners with rounded rectangles like Adobe PS
        const drawCorner = (cx, cy) => {
            ctx.beginPath();
            ctx.roundRect(cx - cornerSize/2, cy - cornerSize/2, cornerSize, cornerSize, 2 / zoom);
            ctx.fill();
        };
        
        // Top-left corner
        drawCorner(x, y);
        // Top-right corner
        drawCorner(x + width, y);
        // Bottom-left corner
        drawCorner(x, y + height);
        // Bottom-right corner
        drawCorner(x + width, y + height);
        
        ctx.restore();
    }

    addPoint(x, y) {
        console.log('📍 Adding point at:', { x, y });
        
        // Check if label is selected
        if (!this.selectedLabel) {
            console.log('❌ No label selected, cannot create point annotation');
            NotificationManager.error('Please select a label first');
            return;
        }
        
        const annotation = {
            type: 'point',
            x: x,
            y: y,
            label: this.selectedLabel,
            color: this.getLabelColor(this.selectedLabel)
        };
        
        this.addAnnotation(annotation);
    }

    addAnnotation(annotation) {
        if (!this.currentImage) {
            console.log('❌ No current image for annotation');
            return;
        }
        
        const imagePath = this.currentImage.path;
        console.log('🔍 Adding annotation to image:', imagePath);
        console.log('🔍 Current image index:', this.currentImageIndex);
        console.log('🔍 Current image object:', this.currentImage);
        
        if (!this.annotations[imagePath]) {
            this.annotations[imagePath] = [];
        }
        
        // Add timestamp for history system
        annotation.timestamp = Date.now() + Math.random();
        
        this.annotations[imagePath].push(annotation);
        console.log('✅ Annotation added to image:', imagePath);
        console.log('✅ Total annotations for this image:', this.annotations[imagePath].length);
        
        // Save to history
        this.historyManager.saveToHistory('add_annotation', {
            annotation: annotation
        });
        
        // Smooth redraw without flickering
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
    }

    getLabelColor(label) {
        if (!this.labelColors[label]) {
            // Generate random color
            const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
            this.labelColors[label] = colors[Object.keys(this.labelColors).length % colors.length];
        }
        return this.labelColors[label];
    }

    drawAnnotations() {
        if (!this.currentImage) return;

        const imagePath = this.currentImage.path;
        const annotations = this.annotations[imagePath] || [];

        console.log('🎨 Drawing annotations:', annotations.length);

        // Save context state for zoom/pan
        this.ctx.save();
        
        // Get zoom and pan values
        const zoom = this.canvasManager.getZoom();
        const pan = this.canvasManager.getPan();
        
        // Calculate image center position
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.cachedImage.naturalWidth;
        const imageHeight = this.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Apply transformations to annotation coordinates
        this.ctx.translate(centerX + pan.x, centerY + pan.y);
        this.ctx.scale(zoom, zoom);

        annotations.forEach(annotation => {
            this.drawAnnotation(annotation);
        });
        
        // Restore context state
        this.ctx.restore();
    }

    drawAnnotation(annotation) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = annotation.color;
        ctx.fillStyle = annotation.color;
        ctx.lineWidth = 2;

        // Check if annotation is selected
        const isSelected = this.selectedAnnotations.has(annotation);

        switch (annotation.type) {
            case 'boundingbox':
                // Draw bounding box
                ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
                
                // Draw selection highlight
                if (isSelected) {
                    ctx.save();
                    ctx.strokeStyle = '#007AFF';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
                    ctx.restore();
                    
                    // Draw resize handles
                    this.drawBoundingBoxHandles(annotation);
                }
                
                this.drawLabel(annotation.label, annotation.x, annotation.y - 5);
                break;
                
            case 'point':
                // Draw point with professional styling
                ctx.save();
                ctx.fillStyle = annotation.color;
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                
                // Main point circle
                ctx.beginPath();
                ctx.arc(annotation.x, annotation.y, 6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                
                if (isSelected) {
                    // Selection highlight
                    ctx.save();
                    ctx.strokeStyle = '#007AFF';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(annotation.x, annotation.y, 10, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.restore();
                }
                
                ctx.restore();
                
                this.drawLabel(annotation.label, annotation.x + 15, annotation.y - 5);
                break;
                
            case 'polygon':
                if (annotation.points && annotation.points.length >= 3) {
                    ctx.beginPath();
                    ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
                    for (let i = 1; i < annotation.points.length; i++) {
                        ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    
                    if (isSelected) {
                        ctx.save();
                        ctx.strokeStyle = '#007AFF';
                        ctx.lineWidth = 3;
                        ctx.stroke();
        ctx.restore();
                        
                        // Draw polygon handles
                        this.drawPolygonHandles(annotation);
                    }
                    
                    this.drawLabel(annotation.label, annotation.points[0].x, annotation.points[0].y - 5);
                }
                break;
                
            case 'polyline':
                if (annotation.points && annotation.points.length >= 2) {
                    // Draw polyline with professional styling
                    ctx.save();
                    ctx.strokeStyle = annotation.color;
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    ctx.beginPath();
                    ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
                    for (let i = 1; i < annotation.points.length; i++) {
                        ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
                    }
                    ctx.stroke();
                    
                    // Draw points
                    ctx.fillStyle = annotation.color;
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    annotation.points.forEach(point => {
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                    });
                    
                    if (isSelected) {
                        ctx.save();
                        ctx.strokeStyle = '#007AFF';
                        ctx.lineWidth = 3;
                        ctx.stroke();
                        ctx.restore();
                        
                        // Draw resize handles for polyline
                        this.drawPolylineHandles(annotation);
                    }
                    
                    ctx.restore();
                    
                    this.drawLabel(annotation.label, annotation.points[0].x, annotation.points[0].y - 5);
                }
                break;
                
            case 'keypoint':
                // Professional keypoint drawing
                ctx.save();
                
                // Main keypoint circle
                ctx.fillStyle = annotation.color;
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(annotation.x, annotation.y, 8, 0, 2 * Math.PI); // 8px main circle
                ctx.fill();
                ctx.stroke();
                
                // Selection highlight
                if (isSelected) {
                    ctx.strokeStyle = '#007AFF';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(annotation.x, annotation.y, 12, 0, 2 * Math.PI); // 12px selection circle
                    ctx.stroke();
                }
                
                // Draw keypoint crosshair for better visibility
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(annotation.x - 4, annotation.y);
                ctx.lineTo(annotation.x + 4, annotation.y);
                ctx.moveTo(annotation.x, annotation.y - 4);
                ctx.lineTo(annotation.x, annotation.y + 4);
                ctx.stroke();
                
                ctx.restore();
                
                // Draw label with background
                this.drawLabel(annotation.label, annotation.x + 15, annotation.y - 5);
                break;
                
            case 'maskpaint':
                // Professional mask paint drawing
                ctx.save();
                
                // Draw mask paint strokes with smooth curves
                ctx.strokeStyle = annotation.color;
                ctx.lineWidth = annotation.brushSize || 20;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalAlpha = 0.7; // Better visibility
                
                if (annotation.points && annotation.points.length >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
                    
                    // Use quadratic curves for smoother strokes
                    for (let i = 1; i < annotation.points.length - 1; i++) {
                        const current = annotation.points[i];
                        const next = annotation.points[i + 1];
                        const midX = (current.x + next.x) / 2;
                        const midY = (current.y + next.y) / 2;
                        ctx.quadraticCurveTo(current.x, current.y, midX, midY);
                    }
                    
                    // Draw to the last point
                    const lastPoint = annotation.points[annotation.points.length - 1];
                    ctx.lineTo(lastPoint.x, lastPoint.y);
                    ctx.stroke();
                }
                
                // Selection highlight
                if (isSelected) {
                    ctx.strokeStyle = '#007AFF';
                    ctx.lineWidth = 3;
                    ctx.globalAlpha = 1;
                    ctx.stroke();
                }
                
                ctx.restore();
                
                // Draw label with stroke count
                const strokeCount = annotation.strokeCount || annotation.points.length;
                this.drawLabel(`${annotation.label} (${strokeCount} strokes)`, annotation.points[0].x, annotation.points[0].y - 10);
                break;
                
            case 'pose':
                // Professional pose drawing
                ctx.save();
                
                // Draw skeleton connections first
                ctx.strokeStyle = annotation.color;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                if (annotation.connections) {
                    annotation.connections.forEach(connection => {
                        const [startIndex, endIndex] = connection;
                        const startPoint = annotation.keypoints[startIndex];
                        const endPoint = annotation.keypoints[endIndex];
                        
                        if (startPoint && endPoint) {
                            ctx.beginPath();
                            ctx.moveTo(startPoint.x, startPoint.y);
                            ctx.lineTo(endPoint.x, endPoint.y);
                            ctx.stroke();
                        }
                    });
                }
                
                // Draw keypoints
                ctx.fillStyle = annotation.color;
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                
                annotation.keypoints.forEach((keypoint, index) => {
                    // Draw keypoint circle
                    ctx.beginPath();
                    ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    
                    // Draw keypoint name (shortened) instead of number
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 8px Arial';
                    ctx.textAlign = 'center';
                    const shortName = this.shortenKeypointName(keypoint.name);
                    ctx.fillText(shortName, keypoint.x, keypoint.y + 3);
                    ctx.fillStyle = annotation.color;
                });
                
                // Selection highlight
                if (isSelected) {
                    ctx.strokeStyle = '#007AFF';
                    ctx.lineWidth = 3;
                    annotation.keypoints.forEach(keypoint => {
                        ctx.beginPath();
                        ctx.arc(keypoint.x, keypoint.y, 12, 0, 2 * Math.PI);
                        ctx.stroke();
                    });
                }
                
                ctx.restore();
                
                // Draw label
                this.drawLabel(annotation.label, annotation.keypoints[0].x, annotation.keypoints[0].y - 15);
                break;
        }

        ctx.restore();
    }

    drawBoundingBoxHandles(annotation) {
        const ctx = this.ctx;
        const handles = this.getBoundingBoxHandles(annotation);
        
        ctx.save();
        ctx.fillStyle = '#007AFF';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        handles.forEach(handle => {
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, 8, 0, 2 * Math.PI); // Increased from 4 to 8 pixels
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }

    drawPolygonHandles(annotation) {
        const ctx = this.ctx;
        const handles = this.getPolygonHandles(annotation);
        
        ctx.save();
        ctx.fillStyle = '#007AFF';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        handles.forEach(handle => {
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, 8, 0, 2 * Math.PI); // 8px handles for polygon
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }

    drawPolylineHandles(annotation) {
        const ctx = this.ctx;
        const handles = this.getPolylineHandles(annotation);
        
        ctx.save();
        ctx.fillStyle = '#007AFF';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        handles.forEach(handle => {
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, 8, 0, 2 * Math.PI); // 8px handles for polyline
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }

    drawLabel(label, x, y) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y - 15, label.length * 8 + 10, 20);
        ctx.fillStyle = 'white';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(label, x + 5, y - 2);
        ctx.restore();
    }

    // ========== UI METHODS ==========
    updateUI() {
        this.uiManager.updateUI();
    }

    updateHistoryButtons() {
        this.historyManager.updateHistoryButtons();
    }

    // ========== EXPORT METHODS ==========
    openExportModal() {
        this.exportManager.openExportModal();
    }

    closeExportModal() {
        this.exportManager.closeExportModal();
    }

    exportAnnotations(format) {
        this.exportManager.exportAnnotations(format);
    }

    // ========== ANNOTATION MANAGEMENT ==========
    duplicateSelected() {
        if (this.selectedAnnotations.size === 0) return;
        
        const imagePath = this.currentImage.path;
        const annotations = this.annotations[imagePath] || [];
        
        // Store duplicated annotations for history
        const duplicatedAnnotations = [];
        
        this.selectedAnnotations.forEach(annotation => {
            const duplicate = JSON.parse(JSON.stringify(annotation));
            duplicate.timestamp = Date.now() + Math.random();
            duplicate.x += 20; // Offset slightly
            duplicate.y += 20;
            
            annotations.push(duplicate);
            duplicatedAnnotations.push(duplicate);
        });
        
        // Save to history - store duplicated annotations
        this.historyManager.saveToHistory('duplicate_annotation', {
            annotations: duplicatedAnnotations
        });
        
        // Redraw
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
        
        NotificationManager.success(`${this.selectedAnnotations.size} annotation(s) duplicated`);
    }
    
    clearAllAnnotations() {
        if (!this.currentImage) return;
        
        const imagePath = this.currentImage.path;
        const annotations = this.annotations[imagePath] || [];
        
        if (annotations.length === 0) {
            NotificationManager.info('No annotations to clear');
            return;
        }
        
        // Store for history
        const clearedAnnotations = [...annotations];
        this.annotations[imagePath] = [];
        
        // Save to history
        this.historyManager.saveToHistory('clear_annotations', {
            annotations: clearedAnnotations
        });
        
        // Clear selection
        this.selectedAnnotations.clear();
        
        // Redraw
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.cachedImage) {
            this.drawCachedImage();
        }
        this.drawAnnotations();
        
        NotificationManager.success(`${clearedAnnotations.length} annotation(s) cleared`);
    }
    
    // ========== PERFORMANCE METHODS ==========
    processRenderQueue() {
        if (this.renderQueue.length > 0) {
            const operation = this.renderQueue.shift();
            if (operation === 'redraw') {
                this.redrawCanvas();
            }
        }
    }
    
    clearCache() {
        this.imageCache.clear();
        this.annotationCache.clear();
        console.log('🧹 Cache cleared');
    }
    
    optimizePerformance() {
        // Clear old cache entries
        if (this.imageCache.size > 10) {
            const firstKey = this.imageCache.keys().next().value;
            this.imageCache.delete(firstKey);
        }
        
        // Clear annotation cache
        this.annotationCache.clear();
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }
    
    // ========== GLOBAL ACCESS ==========
    makeGlobal() {
        window.tagiFLY = this;
        window.CONFIG = CONFIG;
        window.NotificationManager = NotificationManager;
        
        // Expose label management functions
        window.tagiFLY.deleteLabel = (label) => this.uiManager.deleteLabel(label);
        window.tagiFLY.addLabel = () => this.uiManager.addLabel();
        window.tagiFLY.selectLabel = (label) => this.uiManager.selectLabel(label);
        
        // Expose annotation management functions
        window.tagiFLY.duplicateSelected = () => this.duplicateSelected();
        window.tagiFLY.clearAllAnnotations = () => this.clearAllAnnotations();
        
        // Expose performance functions
        window.tagiFLY.clearCache = () => this.clearCache();
        window.tagiFLY.optimizePerformance = () => this.optimizePerformance();
    }
}

// ========== INITIALIZE APPLICATION ==========
document.addEventListener('DOMContentLoaded', () => {
    const app = new TagiFLYApp();
    app.makeGlobal();
});
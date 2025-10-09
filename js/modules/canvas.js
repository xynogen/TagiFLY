// TagiFLY Canvas Management Module
// Zoom, pan, image handling, performance optimizations

export class CanvasManager {
    constructor(app) {
        this.app = app;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.zoomStep = 0.1;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.imageWidth = 0;
        this.imageHeight = 0;
    }

    // ========== ZOOM CONTROLS ==========
    zoomIn() {
        const oldZoom = this.zoom;
        this.zoom = Math.min(this.zoom * 1.2, this.maxZoom);
        
        // Zoom towards center
        const centerX = this.app.canvas.width / 2;
        const centerY = this.app.canvas.height / 2;
        
        this.zoomTowards(centerX, centerY, oldZoom);
        this.updateZoomIndicator();
        this.app.redrawCanvas();
        
        console.log('🔍 Zoom in:', this.zoom.toFixed(2));
    }

    zoomOut() {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.zoom / 1.2, this.minZoom);
        
        // Zoom towards center
        const centerX = this.app.canvas.width / 2;
        const centerY = this.app.canvas.height / 2;
        
        this.zoomTowards(centerX, centerY, oldZoom);
        this.updateZoomIndicator();
        this.app.redrawCanvas();
        
        console.log('🔍 Zoom out:', this.zoom.toFixed(2));
    }

    zoomTowards(x, y, oldZoom) {
        const zoomRatio = this.zoom / oldZoom;
        
        // Convert screen coordinates to world coordinates
        const worldX = (x - this.panX) / oldZoom;
        const worldY = (y - this.panY) / oldZoom;
        
        // Update pan to keep the world point under the cursor
        this.panX = x - worldX * this.zoom;
        this.panY = y - worldY * this.zoom;
    }

    fitToScreen() {
        if (!this.app.cachedImage) return;
        
        console.log('🔍 Fitting to screen...');
        console.log('📊 Canvas size:', this.app.canvas.width, 'x', this.app.canvas.height);
        console.log('📊 Image size:', this.app.cachedImage.naturalWidth, 'x', this.app.cachedImage.naturalHeight);
        
        // Adobe PS style: Fit to screen - FULL SCREEN, no margins
        const canvasAspect = this.app.canvas.width / this.app.canvas.height;
        const imageAspect = this.app.cachedImage.naturalWidth / this.app.cachedImage.naturalHeight;
        
        let scale;
        if (imageAspect > canvasAspect) {
            // Image is wider - fit to width
            scale = this.app.canvas.width / this.app.cachedImage.naturalWidth;
        } else {
            // Image is taller - fit to height
            scale = this.app.canvas.height / this.app.cachedImage.naturalHeight;
        }
        
        this.zoom = Math.min(scale, this.maxZoom);
        
        // CRITICAL FIX: Reset pan to center the image
        this.panX = 0;
        this.panY = 0;
        
        console.log('🔍 Zoom set to:', this.zoom);
        console.log('🔍 Pan reset to:', this.panX, this.panY);
        
        this.updateZoomIndicator();
        this.app.redrawCanvas();
        
        console.log('🔍 Fit to screen:', this.zoom.toFixed(2));
    }

    actualSize() {
        if (!this.app.cachedImage) return;
        
        this.zoom = 1;
        
        // CRITICAL FIX: Reset pan to center the image
        this.panX = 0;
        this.panY = 0;
        
        this.updateZoomIndicator();
        this.app.redrawCanvas();
        
        console.log('🔍 Actual size:', this.zoom.toFixed(2));
    }

    // ========== MOUSE WHEEL ZOOM ==========
    handleWheelZoom(e) {
        e.preventDefault();
        
        const rect = this.app.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const oldZoom = this.zoom;
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
        
        this.zoomTowards(x, y, oldZoom);
        this.updateZoomIndicator();
        this.app.redrawCanvas();
    }

    // ========== PAN CONTROLS ==========
    startPan(x, y) {
        this.isPanning = true;
        this.lastPanX = x;
        this.lastPanY = y;
        this.app.canvas.style.cursor = 'grabbing';
    }

    updatePan(x, y) {
        if (!this.isPanning) return;
        
        const deltaX = x - this.lastPanX;
        const deltaY = y - this.lastPanY;
        
        this.panX += deltaX;
        this.panY += deltaY;
        
        this.lastPanX = x;
        this.lastPanY = y;
        
        this.app.redrawCanvas();
    }

    endPan() {
        this.isPanning = false;
        this.app.canvas.style.cursor = 'default';
    }

    // ========== COORDINATE TRANSFORMATION ==========
    screenToCanvas(screenX, screenY) {
        return {
            x: (screenX - this.panX) / this.zoom,
            y: (screenY - this.panY) / this.zoom
        };
    }

    canvasToScreen(canvasX, canvasY) {
        return {
            x: canvasX * this.zoom + this.panX,
            y: canvasY * this.zoom + this.panY
        };
    }

    // ========== IMAGE DIMENSIONS ==========
    setImageDimensions(width, height) {
        this.imageWidth = width;
        this.imageHeight = height;
        
        // Set original dimensions in current image
        if (this.app.currentImage) {
            this.app.currentImage.originalWidth = width;
            this.app.currentImage.originalHeight = height;
        }
        
        console.log('📐 Image dimensions set:', { width, height });
    }

    // ========== ZOOM INDICATOR ==========
    updateZoomIndicator() {
        const indicator = document.getElementById('zoomLevel');
        if (indicator) {
            indicator.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    // ========== PERFORMANCE OPTIMIZATIONS ==========
    optimizeCanvas() {
        // Enable high DPI support
        const dpr = window.devicePixelRatio || 1;
        const rect = this.app.canvas.getBoundingClientRect();
        
        this.app.canvas.width = rect.width * dpr;
        this.app.canvas.height = rect.height * dpr;
        
        this.app.ctx.scale(dpr, dpr);
        this.app.canvas.style.width = rect.width + 'px';
        this.app.canvas.style.height = rect.height + 'px';
        
        console.log('⚡ Canvas optimized for high DPI');
    }

    // ========== RESET ==========
    reset() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.updateZoomIndicator();
    }

    // ========== GETTERS ==========
    getZoom() {
        return this.zoom;
    }

    getPan() {
        return { x: this.panX, y: this.panY };
    }

    getImageDimensions() {
        return { width: this.imageWidth, height: this.imageHeight };
    }
    
    // ========== COORDINATE CONVERSION METHODS ==========
    screenToImage(screenX, screenY) {
        if (!this.app.cachedImage) return { x: screenX, y: screenY };
        
        // Get zoom and pan values
        const zoom = this.zoom;
        const panX = this.panX;
        const panY = this.panY;
        
        // Calculate image center position (same as in drawImageAndAnnotations)
        const canvasWidth = this.app.canvas.width;
        const canvasHeight = this.app.canvas.height;
        const imageWidth = this.app.cachedImage.naturalWidth;
        const imageHeight = this.app.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Convert screen coordinates to image coordinates
        const imageX = (screenX - centerX - panX) / zoom;
        const imageY = (screenY - centerY - panY) / zoom;
        
        return { x: imageX, y: imageY };
    }
    
    imageToScreen(imageX, imageY) {
        if (!this.app.cachedImage) return { x: imageX, y: imageY };
        
        // Get zoom and pan values
        const zoom = this.zoom;
        const panX = this.panX;
        const panY = this.panY;
        
        // Calculate image center position (same as in drawImageAndAnnotations)
        const canvasWidth = this.app.canvas.width;
        const canvasHeight = this.app.canvas.height;
        const imageWidth = this.app.cachedImage.naturalWidth;
        const imageHeight = this.app.cachedImage.naturalHeight;
        
        const scaledWidth = imageWidth * zoom;
        const scaledHeight = imageHeight * zoom;
        
        const centerX = (canvasWidth - scaledWidth) / 2;
        const centerY = (canvasHeight - scaledHeight) / 2;
        
        // Convert image coordinates to screen coordinates
        const screenX = imageX * zoom + centerX + panX;
        const screenY = imageY * zoom + centerY + panY;
        
        return { x: screenX, y: screenY };
    }
}
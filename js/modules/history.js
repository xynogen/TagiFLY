// TagiFLY History Management Module
// Undo/Redo sistemi için

import { CONFIG } from './config.js';
import { NotificationManager } from './notification.js';

export class HistoryManager {
    constructor(app) {
        this.app = app;
        this.imageHistory = {}; // Each image has its own history
        this.imageHistoryIndex = {}; // Each image has its own history index
        this.maxHistorySize = CONFIG.HISTORY.MAX_SIZE;
    }

    // ========== HISTORY MANAGEMENT (PER IMAGE) ==========
    saveToHistory(action, data) {
        if (!this.app.currentImage) return;

        const imagePath = this.app.currentImage.path;

        // Initialize history for this image if not exists
        if (!this.imageHistory[imagePath]) {
            this.imageHistory[imagePath] = [];
            this.imageHistoryIndex[imagePath] = -1;
        }

        const history = this.imageHistory[imagePath];
        let historyIndex = this.imageHistoryIndex[imagePath];

        // Remove any future history if we're not at the end
        if (historyIndex < history.length - 1) {
            this.imageHistory[imagePath] = history.slice(0, historyIndex + 1);
        }

        // Add new history entry
        const historyEntry = {
            action: action,
            timestamp: Date.now(),
            imagePath: imagePath,
            data: JSON.parse(JSON.stringify(data)) // Deep clone
        };

        this.imageHistory[imagePath].push(historyEntry);
        this.imageHistoryIndex[imagePath] = this.imageHistory[imagePath].length - 1;

        // Limit history size per image
        if (this.imageHistory[imagePath].length > this.maxHistorySize) {
            this.imageHistory[imagePath].shift();
            this.imageHistoryIndex[imagePath]--;
        }

        this.updateHistoryButtons();
        console.log(`💾 History saved for ${imagePath}: ${action}`, historyEntry);
    }

    undo() {
        if (!this.app.currentImage) return;

        const imagePath = this.app.currentImage.path;
        const historyIndex = this.imageHistoryIndex[imagePath] || -1;

        if (historyIndex < 0) {
            NotificationManager.info('Nothing to undo in this image');
            return;
        }

        const history = this.imageHistory[imagePath];
        const historyEntry = history[historyIndex];

        this.applyHistoryEntry(historyEntry, 'undo');
        this.imageHistoryIndex[imagePath]--;
        this.updateHistoryButtons();

        // Silent undo - no notification spam
        console.log(`↶ Undo applied for ${imagePath}:`, historyEntry);
    }

    redo() {
        if (!this.app.currentImage) return;

        const imagePath = this.app.currentImage.path;
        const history = this.imageHistory[imagePath] || [];
        const historyIndex = this.imageHistoryIndex[imagePath] || -1;

        if (historyIndex >= history.length - 1) {
            NotificationManager.info('Nothing to redo in this image');
            return;
        }

        this.imageHistoryIndex[imagePath]++;
        const historyEntry = history[this.imageHistoryIndex[imagePath]];

        this.applyHistoryEntry(historyEntry, 'redo');
        this.updateHistoryButtons();

        // Silent redo - no notification spam
        console.log(`↷ Redo applied for ${imagePath}:`, historyEntry);
    }

    applyHistoryEntry(entry, direction) {
        if (!entry.imagePath || !this.app.annotations[entry.imagePath]) return;

        const imagePath = entry.imagePath;

        switch (entry.action) {
            case 'add_annotation':
                if (direction === 'undo') {
                    // Remove the annotation
                    const annotations = this.app.annotations[imagePath];
                    const index = annotations.findIndex(ann =>
                        ann.timestamp === entry.data.annotation.timestamp
                    );
                    if (index > -1) {
                        // Special handling for mask annotations
                        if (entry.data.annotation.type === 'mask') {
                            this.app.clearMaskCanvas();
                        }
                        annotations.splice(index, 1);
                        this.app.redrawCanvas();
                    }
                } else {
                    // Add the annotation back
                    this.app.annotations[imagePath].push(entry.data.annotation);
                    this.app.redrawCanvas();
                }
                break;

            case 'delete_annotation':
                if (direction === 'undo') {
                    // Restore the annotation
                    this.app.annotations[imagePath].push(entry.data.annotation);
                    this.app.redrawCanvas();
                } else {
                    // Remove the annotation again
                    const annotations = this.app.annotations[imagePath];
                    const index = annotations.findIndex(ann =>
                        ann.timestamp === entry.data.annotation.timestamp
                    );
                    if (index > -1) {
                        annotations.splice(index, 1);
                        this.app.redrawCanvas();
                    }
                }
                break;

            case 'edit_annotation':
                if (direction === 'undo') {
                    // Restore original annotation
                    const annotations = this.app.annotations[imagePath];
                    const index = annotations.findIndex(ann =>
                        ann.timestamp === entry.data.originalAnnotation.timestamp
                    );
                    if (index > -1) {
                        annotations[index] = entry.data.originalAnnotation;
                        this.app.redrawCanvas();
                    }
                } else {
                    // Apply the edit again
                    const annotations = this.app.annotations[imagePath];
                    const index = annotations.findIndex(ann =>
                        ann.timestamp === entry.data.originalAnnotation.timestamp
                    );
                    if (index > -1) {
                        annotations[index] = entry.data.editedAnnotation;
                        this.app.redrawCanvas();
                    }
                }
                break;

            case 'move_annotation':
                if (direction === 'undo') {
                    // Restore original positions
                    entry.data.annotations.forEach(annotation => {
                        const annotations = this.app.annotations[imagePath];
                        const index = annotations.findIndex(ann =>
                            ann.timestamp === annotation.timestamp
                        );
                        if (index > -1) {
                            annotations[index] = annotation;
                        }
                    });
                    this.app.redrawCanvas();
                } else {
                    // Apply the move again
                    entry.data.annotations.forEach(annotation => {
                        const annotations = this.app.annotations[imagePath];
                        const index = annotations.findIndex(ann =>
                            ann.timestamp === annotation.timestamp
                        );
                        if (index > -1) {
                            annotations[index] = annotation;
                        }
                    });
                    this.app.redrawCanvas();
                }
                break;

            case 'resize_annotation':
                if (direction === 'undo') {
                    // Restore original sizes
                    entry.data.annotations.forEach(annotation => {
                        const annotations = this.app.annotations[imagePath];
                        const index = annotations.findIndex(ann =>
                            ann.timestamp === annotation.timestamp
                        );
                        if (index > -1) {
                            annotations[index] = annotation;
                        }
                    });
                    this.app.redrawCanvas();
                } else {
                    // Apply the resize again
                    entry.data.annotations.forEach(annotation => {
                        const annotations = this.app.annotations[imagePath];
                        const index = annotations.findIndex(ann =>
                            ann.timestamp === annotation.timestamp
                        );
                        if (index > -1) {
                            annotations[index] = annotation;
                        }
                    });
                    this.app.redrawCanvas();
                }
                break;

            case 'duplicate_annotation':
                if (direction === 'undo') {
                    // Remove duplicated annotations
                    entry.data.annotations.forEach(annotation => {
                        const annotations = this.app.annotations[imagePath];
                        const index = annotations.findIndex(ann =>
                            ann.timestamp === annotation.timestamp
                        );
                        if (index > -1) {
                            annotations.splice(index, 1);
                        }
                    });
                    this.app.redrawCanvas();
                } else {
                    // Add duplicated annotations back
                    entry.data.annotations.forEach(annotation => {
                        this.app.annotations[imagePath].push(annotation);
                    });
                    this.app.redrawCanvas();
                }
                break;

            case 'clear_annotations':
                if (direction === 'undo') {
                    // Restore all annotations
                    this.app.annotations[imagePath] = entry.data.annotations;
                    this.app.redrawCanvas();
                } else {
                    // Clear annotations again
                    this.app.annotations[imagePath] = [];
                    this.app.redrawCanvas();
                }
                break;
        }
    }

    updateHistoryButtons() {
        if (!this.app.currentImage) {
            document.getElementById('undoBtn').disabled = true;
            document.getElementById('redoBtn').disabled = true;
            return;
        }

        const imagePath = this.app.currentImage.path;
        const historyIndex = this.imageHistoryIndex[imagePath] || -1;
        const history = this.imageHistory[imagePath] || [];

        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) undoBtn.disabled = historyIndex < 0;
        if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
    }

    // Clear history for a specific image
    clearImageHistory(imagePath) {
        if (this.imageHistory[imagePath]) {
            delete this.imageHistory[imagePath];
            delete this.imageHistoryIndex[imagePath];
            console.log(`🗑️ History cleared for image: ${imagePath}`);
        }
    }

    // Get history info for current image
    getHistoryInfo() {
        if (!this.app.currentImage) return null;

        const imagePath = this.app.currentImage.path;
        const history = this.imageHistory[imagePath] || [];
        const historyIndex = this.imageHistoryIndex[imagePath] || -1;

        return {
            totalEntries: history.length,
            currentIndex: historyIndex,
            canUndo: historyIndex >= 0,
            canRedo: historyIndex < history.length - 1
        };
    }
}

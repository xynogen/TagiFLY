# TagiFLY v2.0.0 🚀

**Professional AI Labelling Tool for Computer Vision**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-38.2.2-blue.svg)](https://electronjs.org/)
[![Version](https://img.shields.io/badge/Version-2.0.0-green.svg)](https://github.com/dvtlab/tagifly)

Open source, lightweight, and focused only on what you need.
> **TagiFLY v2.0.0** is a professional, cross-platform desktop application for AI computer vision data labeling.


## 📸 Screenshots

| Main Screen | Annotation Example |
|-------------|---------------------|
| ![Main](ss/s1.png) | ![Annotation](ss/s2.png) |

| Export Window | Dark Mode | Light Mode |
|---------------|-----------|------------|
| ![Export](ss/s3.png) | ![Dark](ss/s4.png) | ![Light](ss/s5.png) |

## ✨ Features

### 🎯 **Professional Annotation Tools**
- **Bounding Box**: Rectangle annotations for object detection
- **Polygon**: Complex shape annotations with precise boundaries
- **Point**: Single point annotations for key features
- **Keypoint/Pose**: 17-point human pose estimation annotations
- **Mask Paint**: Brush-based segmentation annotations
- **Polyline**: Line and path annotations

### 📤 **Multiple Export Formats**
- **JSON**: General-purpose format with full metadata
- **YOLO**: Machine learning format for object detection
- **COCO**: Microsoft COCO dataset format
- **Pascal VOC**: XML format for computer vision

### 🎨 **Modern User Experience**
- **Light/Dark Theme**: Professional UI with theme switching
- **High DPI Support**: Crisp graphics on Retina displays
- **Keyboard Shortcuts**: Efficient workflow with hotkeys
- **Undo/Redo**: Per-image history management
- **Zoom & Pan**: Professional canvas navigation

### 🔧 **Advanced Features**
- **Label Management**: Export/import label configurations
- **Performance Optimized**: Cached rendering and smooth interactions
- **Cross-Platform**: Windows, macOS, and Linux support
- **Professional Canvas**: High-performance image rendering

## ⚠️ Note 

This is the **second release **.  
It may contain bugs or missing features. Please share your feedback so we can improve it together. 🚀  

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dvtlab/tagifly.git
   cd tagifly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

## 📖 User Guide

### Getting Started

1. **Select Folder**: Click "Select Folder" to load your images
2. **Choose Annotation Tool**: Select from 6 professional annotation tools
3. **Add Labels**: Create custom labels or use predefined ones
4. **Annotate**: Click and drag to create annotations
5. **Export**: Choose from 4 export formats (JSON, YOLO, COCO, Pascal VOC)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `B` | Bounding Box tool |
| `P` | Polygon tool |
| `O` | Point tool |
| `K` | Keypoint/Pose tool |
| `M` | Mask Paint tool |
| `L` | Polyline tool |
| `F` | Fit to screen |
| `1-9` | Quick label assignment |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Delete` | Remove selected annotation |
| `ESC` | Cancel current operation |

### Label Management

- **Export Labels**: Save your label configuration as JSON
- **Import Labels**: Load previously saved label configurations
- **Custom Colors**: Each label can have a custom color
- **Statistics**: View total labels and last updated time

## 🎯 Key Features in v2.0.0

### 🚀 **Professional Annotation System**
- **6 Annotation Tools**: Bounding Box, Polygon, Point, Keypoint/Pose, Mask Paint, Polyline
- **Smart Selection**: Enhanced drag and move for all annotation types
- **Real-time Feedback**: Step-by-step guidance for pose annotation
- **Professional Canvas**: High DPI support with smooth zoom and pan

### 📤 **Advanced Export System**
- **4 Export Formats**: JSON, YOLO, COCO, Pascal VOC - all working perfectly
- **Fixed ZIP Issues**: Resolved corruption problems in YOLO and Pascal VOC exports
- **Format Validation**: Comprehensive validation for all export types
- **Metadata Support**: Rich metadata in all export formats

### 🎨 **Enhanced User Experience**
- **Modern UI**: Professional light/dark theme with smooth transitions
- **Fixed Dark Mode**: Resolved invisible text issues in input fields
- **Smart Notifications**: Centered notification system for better visibility
- **Keyboard Shortcuts**: Conflict-free shortcuts that work with input fields

### 🔧 **Label Management System**
- **Export/Import Labels**: Save and load your label configurations
- **Tab Interface**: Professional two-tab system (Labels & Import/Export)
- **Smart Merging**: Duplicate prevention during label import
- **Statistics Tracking**: Real-time label count and update information

## 🆕 What's New in v2.0.0

### 🎯 **Revolutionary Improvements**

#### **🔧 Export System Overhaul**
- **🚀 Fixed YOLO Export**: Resolved ZIP file corruption - now exports perfect ZIP files
- **🚀 Fixed Pascal VOC Export**: Eliminated module loading errors - seamless XML generation
- **🚀 Enhanced COCO Export**: Improved segmentation data handling
- **🚀 Buffer Management**: Fixed ArrayBuffer to Buffer conversion for reliable file saving
- **🚀 Format Validation**: Comprehensive validation ensures data integrity

#### **🎨 User Experience Revolution**
- **✨ Smart Notifications**: Moved to center header - no more UI blocking
- **✨ Dark Mode Perfection**: Fixed invisible text in input fields and zoom indicators
- **✨ Keyboard Harmony**: Resolved all conflicts between shortcuts and input fields
- **✨ Zoom Mastery**: Fixed centering issues - zoom now works like Photoshop
- **✨ Pose Guidance**: Step-by-step instructions for 17-point human pose annotation

#### **🔄 Annotation Tools Enhancement**
- **🎯 Keypoint/Pose Selection**: Fixed drag and move - now works flawlessly
- **🎯 Mask Paint Selection**: Added proper selection handling for brush strokes
- **🎯 ESC Key Intelligence**: Enhanced pose drawing cancellation with cleanup
- **🎯 Universal Undo/Redo**: Fixed for all annotation types - never lose work again

#### **📤 Brand New Label Management**
- **🆕 Label Export/Import**: Save your label configurations as JSON files
- **🆕 Professional Tab System**: Two-tab interface (Labels & Import/Export)
- **🆕 Smart Statistics**: Real-time label count and last updated tracking
- **🆕 Duplicate Prevention**: Intelligent merging during label import
- **🆕 Workflow Continuity**: Continue projects across sessions

#### **⚡ Performance Breakthrough**
- **🚀 High DPI Excellence**: Perfect rendering on Retina displays
- **🚀 Memory Optimization**: Advanced caching for smooth performance
- **🚀 Animation Smoothness**: Enhanced UI transitions and interactions
- **🚀 Error Resilience**: Robust error handling throughout the application

#### **🎯 Professional Grade Features**
- **💼 Export Validation**: Comprehensive format validation for all export types
- **💼 File Management**: Improved folder selection and file handling
- **💼 User Feedback**: Enhanced notification system with better visibility
- **💼 Cross-Platform**: Optimized for Windows, macOS, and Linux

## 🎯 Use Cases

- **Object Detection**: Create bounding box datasets for YOLO training
- **Semantic Segmentation**: Generate mask annotations for segmentation models
- **Pose Estimation**: Label human pose keypoints for pose estimation
- **Custom Datasets**: Build specialized datasets for any computer vision task
- **Research Projects**: Academic and commercial research applications



## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- Icons from [Heroicons](https://heroicons.com/)
- Fonts from [Google Fonts](https://fonts.google.com/)
- Inspired by modern AI labeling tools



<div align="center">

## 👨‍💻 Author

**TagiFLY v2.0.0** - Labelling Tool for AI Computer Vision 🚀

⭐ If TagiFLY helps you, don’t forget to leave a star!  

Made with 💙 by dvtlab  

📧 Contact: dvtlab@outlook.com  

</div>

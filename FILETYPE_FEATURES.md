# File Type Detection System

This document describes the enhanced file type detection system implemented in BucketViewer.

## Overview

The application now features a comprehensive file type detection system that provides accurate file type identification, appropriate icons, and user-friendly display names for files in S3 buckets.

## Features

### 1. Comprehensive File Type Support

The system supports over 100 file types across multiple categories:

- **Images**: JPEG, PNG, GIF, SVG, WebP, TIFF, BMP, ICO
- **Documents**: PDF, Word, Excel, PowerPoint, OpenDocument formats
- **Code Files**: JavaScript, TypeScript, Python, Java, C/C++, Rust, Go, and more
- **Text Files**: Markdown, Plain text, RTF, Org mode
- **Audio**: MP3, WAV, FLAC, AAC, OGG, M4A
- **Video**: MP4, AVI, MOV, WebM, MKV, WMV
- **Archives**: ZIP, RAR, 7Z, TAR, GZIP, DMG, ISO
- **Fonts**: TTF, OTF, WOFF, WOFF2
- **Executables**: EXE, MSI, DEB, RPM, AppImage
- **Data Files**: CSV, JSON, XML, YAML, Parquet

### 2. Intelligent Detection Logic

The system uses a multi-layered approach for file type detection:

1. **Extension-based Detection**: Primary method using comprehensive file extension mapping
2. **S3 Content-Type Fallback**: Uses S3 metadata when available and reliable
3. **Compound Extensions**: Handles complex extensions like `.tar.gz`, `.min.js`
4. **Special Files**: Recognizes dotfiles like `.gitignore`, `.env`

### 3. Visual Enhancements

- **Emoji Icons**: Each file type has an appropriate emoji icon
- **Category Grouping**: Files are organized into logical categories
- **Enhanced Display Names**: User-friendly type descriptions instead of raw MIME types
- **Grid and List Views**: Icons adapt to both view modes

### 4. Improved Sorting

- **Category-first Sorting**: Files sort by category first, then by specific type
- **Intelligent Grouping**: Related file types appear together

## Implementation

### Core Components

#### FileTypeDetector Class (`src/utils/fileTypeDetection.ts`)

The main utility class providing:

```typescript
// Detect file type from filename
FileTypeDetector.detectFileType(filename: string): FileTypeInfo

// Get type info with S3 content-type fallback
FileTypeDetector.getFileTypeInfo(filename: string, s3ContentType?: string): FileTypeInfo

// Utility methods
FileTypeDetector.getDisplayName(filename: string, s3ContentType?: string): string
FileTypeDetector.getFileCategory(filename: string, s3ContentType?: string): string
FileTypeDetector.getFileIcon(filename: string, s3ContentType?: string): string

// Type checking methods
FileTypeDetector.isImage(filename: string, s3ContentType?: string): boolean
FileTypeDetector.isDocument(filename: string, s3ContentType?: string): boolean
FileTypeDetector.isCode(filename: string, s3ContentType?: string): boolean
```

#### FileTypeInfo Interface

```typescript
interface FileTypeInfo {
  mimeType: string;      // Standard MIME type
  category: string;      // File category (Image, Document, Code, etc.)
  displayName: string;   // User-friendly name
  icon: string;         // Emoji icon
}
```

### Integration Points

#### FileExplorer Component

- Uses FileTypeDetector for all file type detection
- Displays emoji icons instead of generic file icons
- Shows enhanced type names in the Type column
- Improved sorting by category and type

#### FileItem Interface

Extended to include:
```typescript
interface FileItem {
  // ... existing fields
  contentType?: string;           // User-friendly display name
  fileCategory?: string;          // File category
  originalContentType?: string;   // Original S3 content-type
}
```

## Usage Examples

### Basic File Type Detection

```typescript
import FileTypeDetector from './utils/fileTypeDetection';

// Detect from filename
const typeInfo = FileTypeDetector.detectFileType('document.pdf');
// Returns: { mimeType: 'application/pdf', category: 'Document', displayName: 'PDF Document', icon: '📄' }

// With S3 content-type
const typeInfo2 = FileTypeDetector.getFileTypeInfo('script.js', 'application/javascript');
// Returns enhanced type information
```

### Type Checking

```typescript
// Check if file is an image
if (FileTypeDetector.isImage('photo.jpg')) {
  // Handle image file
}

// Check category
const category = FileTypeDetector.getFileCategory('script.py');
// Returns: 'Code'
```

### Display Formatting

```typescript
// Get display name
const displayName = FileTypeDetector.getDisplayName('archive.tar.gz');
// Returns: 'Gzip Archive'

// Get icon
const icon = FileTypeDetector.getFileIcon('video.mp4');
// Returns: '🎬'
```

## Special Cases Handled

### Compound Extensions
- `.tar.gz` → Gzip Archive
- `.min.js` → JavaScript (minified)
- `.spec.js` → JavaScript (test)
- `.config.js` → JavaScript (config)

### Dotfiles
- `.gitignore` → Git ignore file
- `.env` → Environment file
- `.bashrc` → Shell config

### Files Without Extensions
- `Dockerfile` → Docker config
- `Makefile` → Build file
- `README` → Documentation

## Benefits

### For Users
- **Clear File Identification**: Immediately understand what type of file they're looking at
- **Better Organization**: Files grouped logically by type and category
- **Visual Clarity**: Emoji icons make file types instantly recognizable
- **Consistent Experience**: Same detection logic across all views

### For Developers
- **Extensible**: Easy to add new file types
- **Reliable**: Fallback mechanisms ensure accurate detection
- **Maintainable**: Centralized logic in a single utility class
- **Type-Safe**: Full TypeScript support with proper interfaces

## Future Enhancements

Potential improvements for the file type detection system:

1. **MIME Type Validation**: Cross-reference detected types with actual file headers
2. **Custom Icons**: Replace emoji with custom SVG icons for better consistency
3. **File Size Estimates**: Provide typical size ranges for different file types
4. **Preview Support**: Integrate with file preview systems
5. **Search by Type**: Add filtering capabilities by file type or category
6. **Bulk Operations**: Type-aware bulk operations (e.g., "compress all images")

## Configuration

The file type mappings are currently hardcoded but could be made configurable:

```typescript
// Potential future configuration
const customMappings = {
  'custom': { mimeType: 'application/custom', category: 'Custom', displayName: 'Custom File', icon: '⚙️' }
};

FileTypeDetector.addCustomMappings(customMappings);
```

This enhanced file type detection system significantly improves the user experience by providing clear, accurate, and visually appealing file type information throughout the application.
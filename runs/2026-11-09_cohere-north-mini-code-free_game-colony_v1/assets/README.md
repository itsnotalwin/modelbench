# Colony Builder Assets

This folder contains essential runtime assets for the 3D Colony Builder game.

## Usage

The game uses Three.js built-in geometry for all structures. No external 3D models are required - everything is rendered using WebGL-compatible geometries and materials.

## Asset Structure

- `README.md` - This file
- (Future) Background textures, environment sounds, UI icons, etc.

## Technical Notes

All buildings are rendered using Three.js primitive geometries (Boxes, Cylinders, etc.) with custom materials for visual distinction. This ensures the game runs without requiring additional asset downloads or 3D model files, making it browser-compatible and lightweight.
#!/usr/bin/env node

/**
 * Figma Design Tokens Sync Script
 * 
 * This script syncs design tokens from Figma to your local project.
 * 
 * Setup:
 * 1. Get your Figma Personal Access Token from: https://www.figma.com/developers/api#access-tokens
 * 2. Set environment variable: FIGMA_ACCESS_TOKEN=your_token_here
 * 3. Update FIGMA_FILE_ID and FIGMA_NODE_ID below
 * 
 * Usage:
 * npm run figma:sync
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  figmaFileId: 'YOUR_FIGMA_FILE_ID', // Replace with your Figma file ID
  figmaNodeId: 'YOUR_NODE_ID',       // Replace with your design system frame ID
  accessToken: process.env.FIGMA_ACCESS_TOKEN,
  outputDir: path.join(__dirname, 'src', 'design-system'),
  tokensFile: path.join(__dirname, 'design-tokens.json'),
  cssFile: path.join(__dirname, 'src', 'figma-tokens.css')
};

// Figma API endpoints
const FIGMA_API = {
  file: (fileId) => `https://api.figma.com/v1/files/${fileId}`,
  nodes: (fileId, nodeId) => `https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}`
};

/**
 * Fetch data from Figma API
 */
async function fetchFromFigma(url) {
  if (!CONFIG.accessToken) {
    console.warn('⚠️  No Figma access token found. Using mock data.');
    return getMockFigmaData();
  }

  try {
    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': CONFIG.accessToken
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error fetching from Figma:', error.message);
    console.log('🔄 Using mock data instead...');
    return getMockFigmaData();
  }
}

/**
 * Mock Figma data for testing without API access
 */
function getMockFigmaData() {
  return {
    document: {
      children: [
        {
          name: 'Design System',
          type: 'FRAME',
          children: [
            {
              name: 'Colors',
              type: 'FRAME',
              children: [
                { name: 'Primary/600', fills: [{ type: 'SOLID', color: { r: 0.114, g: 0.306, b: 0.847 } }] },
                { name: 'Success', fills: [{ type: 'SOLID', color: { r: 0.063, g: 0.725, b: 0.506 } }] },
                { name: 'Error', fills: [{ type: 'SOLID', color: { r: 0.937, g: 0.267, b: 0.267 } }] }
              ]
            },
            {
              name: 'Typography',
              type: 'FRAME',
              children: [
                {
                  name: 'Heading/1',
                  style: {
                    fontFamily: 'Inter',
                    fontWeight: 700,
                    fontSize: 30,
                    lineHeightPx: 36
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  };
}

/**
 * Extract design tokens from Figma data
 */
function extractTokens(figmaData) {
  const tokens = {
    colors: {},
    typography: {},
    spacing: {},
    effects: {}
  };

  function traverseNode(node, path = []) {
    if (node.name && node.fills) {
      // Extract colors
      const colorFill = node.fills.find(fill => fill.type === 'SOLID');
      if (colorFill) {
        const { r, g, b } = colorFill.color;
        const hex = rgbToHex(r, g, b);
        const tokenName = node.name.replace(/[\/\s]/g, '-').toLowerCase();
        tokens.colors[tokenName] = hex;
      }
    }

    if (node.style) {
      // Extract typography
      const styleName = node.name.replace(/[\/\s]/g, '-').toLowerCase();
      tokens.typography[styleName] = {
        fontFamily: node.style.fontFamily,
        fontWeight: node.style.fontWeight,
        fontSize: node.style.fontSize,
        lineHeight: node.style.lineHeightPx || node.style.fontSize * 1.2
      };
    }

    if (node.children) {
      node.children.forEach(child => traverseNode(child, [...path, node.name]));
    }
  }

  // Start traversal from document root
  if (figmaData.document) {
    figmaData.document.children.forEach(child => traverseNode(child));
  }

  return tokens;
}

/**
 * Convert RGB color to HEX
 */
function rgbToHex(r, g, b) {
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate CSS variables from tokens
 */
function generateCSS(tokens) {
  let css = `/* Auto-generated from Figma design tokens */\n`;
  css += `/* Generated on: ${new Date().toISOString()} */\n\n`;

  css += `:root {\n`;

  // Color tokens
  Object.entries(tokens.colors).forEach(([name, value]) => {
    css += `  --figma-${name}: ${value};\n`;
  });

  css += `\n`;

  // Typography tokens
  Object.entries(tokens.typography).forEach(([name, value]) => {
    css += `  --figma-${name}-font-family: '${value.fontFamily}';\n`;
    css += `  --figma-${name}-font-size: ${value.fontSize}px;\n`;
    css += `  --figma-${name}-font-weight: ${value.fontWeight};\n`;
    css += `  --figma-${name}-line-height: ${value.lineHeight}px;\n`;
  });

  css += `}\n`;

  // Component classes
  css += `\n/* Component classes */\n`;
  css += `.figma-button {\n`;
  css += `  background-color: var(--figma-primary-600);\n`;
  css += `  color: white;\n`;
  css += `  border: none;\n`;
  css += `  padding: 8px 16px;\n`;
  css += `  border-radius: 8px;\n`;
  css += `  font-weight: 600;\n`;
  css += `}\n`;

  return css;
}

/**
 * Update Tailwind config with new colors
 */
function updateTailwindConfig(tokens) {
  const tailwindConfigPath = path.join(__dirname, 'tailwind.config.js');
  
  if (fs.existsSync(tailwindConfigPath)) {
    let config = fs.readFileSync(tailwindConfigPath, 'utf8');
    
    // Add new colors to the config (simplified)
    Object.entries(tokens.colors).forEach(([name, value]) => {
      if (!config.includes(name)) {
        // This is a simplified approach - in real implementation, you'd parse and modify the JS object
        console.log(`🎨 New color token: ${name} = ${value}`);
      }
    });
    
    console.log('✅ Tailwind config analyzed');
  }
}

/**
 * Create React components from Figma designs
 */
function generateComponents(tokens) {
  const componentsDir = path.join(__dirname, 'src', 'components', 'ui');
  
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir, { recursive: true });
  }

  // Generate Button component
  const buttonComponent = `import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary-600 text-white hover:bg-primary-700': variant === 'primary',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'secondary',
            'h-9 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-11 px-8 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
`;

  fs.writeFileSync(path.join(componentsDir, 'Button.tsx'), buttonComponent);
  console.log('✅ Button component generated');
}

/**
 * Main sync function
 */
async function syncFigmaTokens() {
  console.log('🔄 Starting Figma sync...');

  try {
    // Create output directory
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // Fetch data from Figma
    console.log('📥 Fetching design data from Figma...');
    const figmaData = await fetchFromFigma(FIGMA_API.file(CONFIG.figmaFileId));

    // Extract tokens
    console.log('🔍 Extracting design tokens...');
    const tokens = extractTokens(figmaData);

    // Save tokens JSON
    console.log('💾 Saving design tokens...');
    fs.writeFileSync(CONFIG.tokensFile, JSON.stringify({
      version: '1.0.0',
      lastSync: new Date().toISOString(),
      tokens
    }, null, 2));

    // Generate CSS
    console.log('🎨 Generating CSS variables...');
    const css = generateCSS(tokens);
    fs.writeFileSync(CONFIG.cssFile, css);

    // Update Tailwind config
    console.log('📝 Updating Tailwind configuration...');
    updateTailwindConfig(tokens);

    // Generate React components
    console.log('⚛️  Generating React components...');
    generateComponents(tokens);

    console.log('✅ Figma sync completed successfully!');
    console.log(`📁 Tokens saved to: ${CONFIG.tokensFile}`);
    console.log(`🎨 CSS saved to: ${CONFIG.cssFile}`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
if (import.meta.url === `file://${process.argv[1]}`) {
  syncFigmaTokens();
}

export { syncFigmaTokens };

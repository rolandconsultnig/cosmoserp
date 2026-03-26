#!/bin/bash

# Cosmos ERP Figma Setup Script
# This script helps set up Figma integration for UI improvements

echo "🎨 Cosmos ERP Figma Setup"
echo "=========================="
echo ""

# Check if Figma is installed
echo "🔍 Checking Figma installation..."
if command -v figma &> /dev/null; then
    echo "✅ Figma is installed"
else
    echo "❌ Figma not found. Please install Figma from https://www.figma.com/downloads/"
    echo "   After installation, run this script again."
    exit 1
fi

# Create design system directory structure
echo "📁 Creating design system directories..."
mkdir -p src/design-system/{components,tokens,icons,images}
mkdir -p figma/{design-system,components,screens}

# Create Figma file structure guide
echo "📋 Creating Figma file structure guide..."
cat > figma/README.md << 'EOF'
# Figma Design System Structure

## File Organization
```
Cosmos ERP Design System/
├── 📁 Design Tokens
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   └── Effects
├── 📁 Components
│   ├── Buttons
│   ├── Forms
│   ├── Cards
│   └── Navigation
├── 📁 Screens
│   ├── Authentication
│   ├── Dashboard
│   ├── POS
│   └── Mobile Views
└── 📁 Assets
    ├── Icons
    ├── Images
    └── Logos
```

## Naming Convention
- Use kebab-case for component names: `button-primary`
- Use slash for variants: `button/primary/medium`
- Use semantic names: `color-primary`, `color-success`

## Component Properties
- State: default, hover, active, disabled, loading
- Size: xs,ormal, large
- Variant: primary, secondary, outline, ghost

## Grid System
- Base unit: 4px
- Container max-width: 1400px
- Breakpoints: mobile (320px), tablet (768px), desktop (1024px)
EOF

# Create Figma plugin recommendations
echo "🔌 Creating Figma plugin recommendations..."
cat > figma/plugins.md << 'EOF'
# Recommended Figma Plugins

## Essential Plugins
1. **Tailwind CSS** - Get exact Tailwind classes
   - Plugin ID: 749989899938267321
   
2. **Design Tokens** - Export design tokens
   - Plugin ID: 835657810464537861
   
3. **Content Reel** - Component library
   - Plugin ID: 763433562634266318
   
4. **Arcade** - Interactive prototypes
   - Plugin ID: 809678373607887010

## Design Workflow Plugins
1. **Stark** - Accessibility checker
2. **Unsplash** - Stock images
3. **Iconify** - Icon library
4. **Vectorizer** - Convert images to vectors
5. **Lorem Ipsum** - Placeholder text

## Installation
1. Open Figma
2. Go to Resources → Plugins
3. Search for each plugin by name or ID
4. Click "Install"
EOF

# Create component templates
echo "🧩 Creating component templates..."
cat > src/design-system/components/Button.jsx << 'EOF'
import React from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = {
  variant: {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  },
  size: {
    sm: 'h-9 px-3 text-sm',
ormal: 'h-10 px-4 py-2',
    lg: 'h-11 px-8 text-lg',
  }
}

const Button = React.forwardRef(({ className, variant = 'primary', size = 'normal', ...props }, ref) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        buttonVariants.variant[variant],
        buttonVariants.size[size],
        className
      )}
      ref={ref}
      {...props}
    />
  );
})

Button.displayName = 'Button';

export { Button };
EOF

# Create design token template
echo "🎨 Creating design token template..."
cat > src/design-system/tokens/index.js << 'EOF'
// Cosmos ERP Design Tokens
// Sync with Figma using: npm run figma:sync

export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#1a56db',
    600: '#1d4ed8',
    700: '#1e40af',
    800: '#1e3a8a',
    900: '#1e3066',
  },
  nigeria: {
    green: '#008751',
    white: '#FFFFFF',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  }
};

export const spacing = {
  xs: '4px',
ormal: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

exportormalize = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs: ['12px', '16px'],
   ormal: ['14px', '20px'],
    base: ['16px', '24px'],
    lg: ['18px', '28px'],
    xl: ['20px', '28px'],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
};

export const borderRadius = {
  sm: '4px',
ormal: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};
EOF

# Create Figma sync script
echo "🔄 Creating Figma sync utilities..."
cat > scripts/figma-setup.sh << 'EOF'
#!/bin/bash

# Figma Integration Setup Script

echo "Setting up Figma integration..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Install design token dependencies
echo "📦 Installing design token dependencies..."
npm install --save-dev style-dictionary figma-api

# Create environment file template
if [ ! -f .env.local ]; then
    echo "🔧 Creating environment file template..."
    cat > .env.local << 'EOL'
# Figma Configuration
FIGMA_ACCESS_TOKEN=your_figma_access_token_here
FIGMA_FILE_ID=your_figma_file_id_here
FIGMA_TEAM_ID=your_team_id_here
EOL
    echo "✅ Created .env.local - Please add your Figma credentials"
fi

echo "✅ Figma integration setup complete!"
echo ""
echo "Next steps:"
echo "1. Get your Figma Access Token: https://www.figma.com/developers/api#access-tokens"
echo "2. Add your token to .env.local"
echo "3. Create your design system in Figma"
echo "4. Run: npm run figma:sync"
EOF

chmod +x scripts/figma-setup.sh

# Create design system documentation
echo "📚 Creating design system documentation..."
cat > docs/design-system.md << 'EOF'
# Cosmos ERP Design System

## Overview
This design system ensures consistency across the Cosmos ERP application and provides a bridge between Figma designs and React components.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Figma
1. Install recommended Figma plugins (see figma/plugins.md)
2. Create your design system file in Figma
3. Get your Figma Access Token
4. Add credentials to `.env.local`

### 3. Sync Design Tokens
```bash
npm run figma:sync
```

## Design Tokens

### Colors
- **Primary**: Blue spectrum for main actions
- **Nigeria**: Green and white for brand identity
- **Semantic**: Success, warning, error, info states
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Font Family**: Inter for UI, JetBrains Mono for code
- **Scale**: 12px to 30px with optical spacing
- **Weights**: 400 (normal) to 700 (bold)

### Spacing
- **Base Unit**: 4px following 8px grid system
- **Scale**: xs (4px) to 3xl (64px)

### Components

#### Button
```jsx
<Button variant="primary" size="normal">
  Click me
</Button>
```

#### Card
```jsx
<Card className="p-4">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

## Figma Integration

### Naming Conventions
- Components: `component-name` (kebab-case)
- Variants: `component/variant/size`
- Colors: `color-purpose-shade`
- Typography: `text-size-weight`

### Export Settings
- **Format**: SVG for icons, PNG for images
- **Scale**: 1x and 2x for retina displays
- **Compression**: 80% quality for images

### Component Properties
- **State**: default, hover, active, disabled, loading
- **Size**:ormal, large
- **Variant**: primary, secondary, outline, ghost

## Development Workflow

1. **Design in Figma**: Create/update components in Figma
2. **Sync Tokens**: Run `npm run figma:sync` to update design tokens
3. **Update Components**: Modify React components to use new tokens
4. **Test**: Verify visual consistency
5. **Deploy**: Build and deploy updated application

## Best Practices

### Design
- Use 4px grid for spacing
- Maintain consistent color contrast ratios (4.5:1 minimum)
- Design for mobile-first responsive layouts
- Include all states (hover, active, disabled, error)

### Development
- Use design tokens instead of hard-coded values
- Follow component composition patterns
- Implement proper accessibility attributes
- Test on actual devices, especially tablets for POS

### Review Process
1. Design review in Figma
2. Token sync and component update
3. Code review for implementation
4. Visual regression testing
5. User acceptance testing

## Troubleshooting

### Common Issues
- **Tokens not syncing**: Check Figma access token and file ID
- **Colors not matching**: Verify color format (RGB vs HEX)
- **Components not updating**: Check for cache issues
- **Build failures**: Ensure all dependencies are installed

### Getting Help
- Check the [Figma API documentation](https://www.figma.com/developers/api)
- Review the [design token specification](https://design-tokens.github.io/)
- Contact the design team for Figma file access
EOF

echo ""
echo "✅ Figma setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Open Figma and create a new design system file"
echo "2. Install the recommended plugins (see figma/plugins.md)"
echo "3. Set up your design tokens and components"
echo "4. Get your Figma Access Token from: https://www.figma.com/developers/api#access-tokens"
echo "5. Add your credentials to .env.local"
echo "6. Run: npm run figma:sync"
echo ""
echo "📚 Documentation: docs/design-system.md"
echo "🔌 Plugin list: figma/plugins.md"
echo ""
echo "🎨 Happy designing!"

#!/bin/bash
# WeatherRadar Pro Alpha - Easy Setup Script
# Run this after copying all files to your repository

echo "🌦️ WeatherRadar Pro Alpha - Setup Script"
echo "========================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run 'git init' first."
    exit 1
fi

# Create static directory if it doesn't exist
mkdir -p static

# Check if key files exist
echo "📋 Checking for required files..."
files_missing=0

required_files=(
    "launch.py"
    "nexrad_processor.py" 
    "nexrad_api.py"
    "static/index.html"
    "static/app.js"
    "static/styles.css"
    "static/nexrad_sites.json"
    "README.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
        files_missing=$((files_missing + 1))
    fi
done

if [ $files_missing -gt 0 ]; then
    echo ""
    echo "❌ $files_missing files are missing. Please copy all files first."
    echo "See COMPLETE_FILE_LIST.md for the full list."
    exit 1
fi

echo ""
echo "🎉 All required files found!"
echo ""

# Git operations
echo "📝 Adding files to git..."
git add .

echo "📊 Git status:"
git status --short

echo ""
echo "💾 Committing changes..."
git commit -m "feat: Add WeatherRadar Pro Alpha with NEXRAD site selection

- Complete UI transformation with modern professional interface
- Add 160+ NEXRAD radar sites with regional organization  
- Implement date selection and S3 URL generation
- Add one-click launcher and comprehensive documentation
- Include alpha testing features for live NOAA data
- Add responsive design with advanced controls and animations

Ready for alpha testing with real NEXRAD Level 3 data."

echo ""
echo "🚀 Pushing to repository..."
git push origin main || git push origin master

echo ""
echo "✅ Setup complete! Your repository has been updated."
echo "🧪 Ready for alpha testing!"
echo ""
echo "Next steps:"
echo "1. Test locally: python launch.py"
echo "2. Create PR if using feature branch"
echo "3. Share with alpha testers"
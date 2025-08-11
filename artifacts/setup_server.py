#!/usr/bin/env python3
"""
Setup script for GIF to WebM Converter Server
Checks dependencies and starts the server
"""

import sys
import os
import subprocess
import platform

def check_python_version():
    """Check if Python version is adequate"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 or higher required")
        print(f"   Current version: {version.major}.{version.minor}.{version.micro}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_ffmpeg():
    """Check if FFmpeg is available"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], 
                              stdout=subprocess.DEVNULL, 
                              stderr=subprocess.DEVNULL)
        if result.returncode == 0:
            print("✅ FFmpeg is available")
            return True
    except FileNotFoundError:
        pass
    
    print("❌ FFmpeg not found")
    print("   Please install FFmpeg:")
    
    system = platform.system().lower()
    if system == "windows":
        print("   - Download from: https://ffmpeg.org/download.html")
        print("   - Or use: winget install ffmpeg")
    elif system == "darwin":  # macOS
        print("   - Install with Homebrew: brew install ffmpeg")
    else:  # Linux
        print("   - Ubuntu/Debian: sudo apt install ffmpeg")
        print("   - CentOS/RHEL: sudo yum install ffmpeg")
    
    return False

def check_required_files():
    """Check if required files exist"""
    required_files = ['gif_to_webm.py']
    missing_files = []
    
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ {file} found")
        else:
            print(f"❌ {file} missing")
            missing_files.append(file)
    
    return len(missing_files) == 0

def install_dependencies():
    """Install Python dependencies"""
    print("\n📦 Installing Python dependencies...")
    
    try:
        # Check if requirements.txt exists
        if os.path.exists('requirements.txt'):
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], 
                         check=True)
        else:
            # Install manually
            packages = ['flask', 'flask-cors']
            for package in packages:
                subprocess.run([sys.executable, '-m', 'pip', 'install', package], 
                             check=True)
        
        print("✅ Dependencies installed successfully")
        return True
    
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def start_server():
    """Start the Flask server"""
    print("\n🚀 Starting GIF to WebM Converter Server...")
    print("   Server will be available at: http://localhost:5000")
    print("   Press Ctrl+C to stop the server")
    print("   " + "="*50)
    
    try:
        # Import and run server
        import server
    except ImportError:
        print("❌ Could not import server.py")
        return False

def main():
    """Main setup function"""
    print("🔧 GIF to WebM Converter Server Setup")
    print("="*40)
    
    # Check requirements
    checks_passed = True
    
    if not check_python_version():
        checks_passed = False
    
    if not check_ffmpeg():
        checks_passed = False
    
    if not check_required_files():
        checks_passed = False
    
    if not checks_passed:
        print("\n❌ Setup requirements not met. Please resolve the issues above.")
        return False
    
    # Install dependencies
    if not install_dependencies():
        return False
    
    # Start server
    start_server()
    return True

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped. Goodbye!")
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)
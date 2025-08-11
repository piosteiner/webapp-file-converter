#!/usr/bin/env python3
"""
Flask Server for GIF to WebM Conversion
Wraps the existing gif_to_webm.py functionality as a web API
"""

from flask import (
    Flask,
    request,
    jsonify,
    send_file,
    render_template_string,
)
from flask_cors import CORS
import tempfile
import os
import json
import subprocess
import sys
from pathlib import Path
import uuid
import shutil
from werkzeug.utils import secure_filename

# Import your existing conversion functions
# Adjust this import path to match your file structure
try:
    from gif_to_webm import convert_gif_to_webm, check_ffmpeg, get_video_info
    HAS_CONVERTER = True
except ImportError:
    print("Warning: gif_to_webm.py not found. Please ensure it's in the same directory.")
    HAS_CONVERTER = False

app = Flask(__name__)
# Allow only your frontends to call the API
ALLOWED_ORIGINS = [
    "https://piogino.ch",
    "https://www.piogino.ch",
    "https://converter.piogino.ch",  # your GitHub Pages subdomain (the website)
    # Add your GitHub Pages user domain if you ever use it directly, e.g.:
    # "https://yourname.github.io",
]
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB hard limit

# Configuration
UPLOAD_FOLDER = 'temp_uploads'
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {'gif'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def cleanup_old_files():
    """Clean up temporary files older than 1 hour"""
    try:
        import time
        current_time = time.time()
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                if current_time - os.path.getctime(file_path) > 3600:  # 1 hour
                    os.remove(file_path)
    except Exception as e:
        print(f"Cleanup warning: {e}")

@app.route('/')
def index():
    """Serve a simple test page"""
    # Only call check_ffmpeg() if the function is available (i.e., module imported)
    ffmpeg_status = "✅ Available" if (HAS_CONVERTER and check_ffmpeg()) else ("❌ Not found" if HAS_CONVERTER else "⚠️ Unknown (converter module missing)")
    converter_status = "✅ Available" if HAS_CONVERTER else "❌ Not found"

    return f"""
    <!DOCTYPE html>
    <html>
    <head><title>GIF to WebM Converter API</title></head>
    <body>
        <h1>GIF to WebM Converter API</h1>
        <p>Server is running successfully!</p>
        <h2>API Endpoints:</h2>
        <ul>
            <li><strong>POST /api/convert</strong> - Convert GIF to WebM</li>
            <li><strong>GET /api/health</strong> - Health check</li>
        </ul>
        <h2>Requirements Check:</h2>
        <ul>
            <li>FFmpeg: {ffmpeg_status}</li>
            <li>Converter: {converter_status}</li>
        </ul>
    </body>
    </html>
    """

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    ffmpeg_ok = check_ffmpeg() if HAS_CONVERTER else False
    return jsonify({
        'status': 'healthy',
        'ffmpeg_available': ffmpeg_ok,
        'converter_available': HAS_CONVERTER
    })

@app.route('/api/convert', methods=['POST'])
def convert_gif():
    """Convert GIF to WebM endpoint"""
    cleanup_old_files()
    
    try:
        # Check if conversion module is available
        if not HAS_CONVERTER:
            return jsonify({'error': 'Conversion module not available'}), 500
        
        # Check if FFmpeg is available
        if not check_ffmpeg():
            return jsonify({'error': 'FFmpeg not found on server'}), 500
        
        # Check if file is provided
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only GIF files are allowed'}), 400
        
        # Check file size
        if request.content_length is None or request.content_length > MAX_FILE_SIZE:
            return jsonify({'error': f'File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB'}), 400
        
        # Get conversion parameters
        max_size_kb = int(request.form.get('max_size', 256))
        mode = request.form.get('mode', 'sticker')  # sticker or emoji
        starting_crf = int(request.form.get('crf', 35))
        
        # Validate parameters
        if max_size_kb < 64 or max_size_kb > 2048:
            return jsonify({'error': 'Invalid max_size. Must be between 64 and 2048 KB'}), 400
        
        if mode not in ['sticker', 'emoji']:
            return jsonify({'error': 'Invalid mode. Must be "sticker" or "emoji"'}), 400
        
        # Generate unique filenames
        file_id = str(uuid.uuid4())
        secure_name = secure_filename(file.filename)
        input_filename = f"{file_id}_{secure_name}"
        input_path = os.path.join(UPLOAD_FOLDER, input_filename)
        
        # Save uploaded file
        file.save(input_path)
        
        # Generate output filename
        output_filename = f"{file_id}_output.webm"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        
        print(f"Converting {input_path} -> {output_path}")
        print(f"Parameters: max_size={max_size_kb}KB, mode={mode}, crf={starting_crf}")
        
        # Get original file info
        original_info = get_video_info(input_path)
        original_size = os.path.getsize(input_path)
        
        # Perform conversion
        success = convert_gif_to_webm(
            input_path=input_path,
            output_path=output_path,
            mode=mode,
            max_size_kb=max_size_kb
        )
        
        if success and os.path.exists(output_path):
            # Get output file info
            output_size = os.path.getsize(output_path)
            output_info = get_video_info(output_path)
            
            # Prepare response data
            response_data = {
                'success': True,
                'original_filename': secure_name,
                'output_filename': f"{Path(secure_name).stem}_{mode}.webm",
                'original_size_bytes': original_size,
                'output_size_bytes': output_size,
                'original_size_kb': round(original_size / 1024, 1),
                'output_size_kb': round(output_size / 1024, 1),
                'compression_ratio': round((1 - output_size / original_size) * 100, 1),
                'mode': mode,
                'max_size_kb': max_size_kb,
                'download_id': file_id
            }
            
            # Add video dimensions if available
            if original_info and 'streams' in original_info:
                for stream in original_info['streams']:
                    if stream.get('codec_type') == 'video':
                        response_data['original_width'] = stream.get('width')
                        response_data['original_height'] = stream.get('height')
                        response_data['original_duration'] = float(original_info.get('format', {}).get('duration', 0))
                        break
            
            if output_info and 'streams' in output_info:
                for stream in output_info['streams']:
                    if stream.get('codec_type') == 'video':
                        response_data['output_width'] = stream.get('width')
                        response_data['output_height'] = stream.get('height')
                        response_data['output_duration'] = float(output_info.get('format', {}).get('duration', 0))
                        break
            
            # Clean up input file
            try:
                os.remove(input_path)
            except:
                pass
            
            return jsonify(response_data)
        
        else:
            # Conversion failed
            try:
                os.remove(input_path)
                if os.path.exists(output_path):
                    os.remove(output_path)
            except:
                pass
            
            return jsonify({
                'success': False,
                'error': f'Conversion failed. Could not create file under {max_size_kb}KB limit.'
            }), 400
    
    except Exception as e:
        print(f"Conversion error: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/download/<file_id>')
def download_file(file_id):
    """Download converted file"""
    try:
        # Find the output file
        output_filename = f"{file_id}_output.webm"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        
        if not os.path.exists(output_path):
            return jsonify({'error': 'File not found or expired'}), 404
        
        # Generate a nice download filename
        download_name = f"converted_sticker_{file_id[:8]}.webm"
        
        def remove_file_after_send():
            try:
                os.remove(output_path)
            except:
                pass
        
        # Send file and schedule cleanup
        response = send_file(
            output_path,
            as_attachment=True,
            download_name=download_name,
            mimetype='video/webm'
        )
        
        # Clean up file after a delay (Flask will handle the sending first)
        import threading
        threading.Timer(10, remove_file_after_send).start()
        
        return response
    
    except Exception as e:
        print(f"Download error: {str(e)}")
        return jsonify({'error': 'Download failed'}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': f'File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/convert-bulk', methods=['POST'])
def convert_bulk():
    """Convert multiple GIF files to WebM"""
    cleanup_old_files()
    
    try:
        if not HAS_CONVERTER:
            return jsonify({'error': 'Conversion module not available'}), 500
        
        if not check_ffmpeg():
            return jsonify({'error': 'FFmpeg not found on server'}), 500
        
        # Get files from request
        files = request.files.getlist('files')
        
        if not files or len(files) == 0:
            return jsonify({'error': 'No files provided'}), 400
        
        # Get conversion parameters
        max_size_kb = int(request.form.get('max_size', 256))
        mode = request.form.get('mode', 'sticker')
        
        # Validate parameters
        if max_size_kb < 64 or max_size_kb > 2048:
            return jsonify({'error': 'Invalid max_size. Must be between 64 and 2048 KB'}), 400
        
        if mode not in ['sticker', 'emoji']:
            return jsonify({'error': 'Invalid mode. Must be "sticker" or "emoji"'}), 400
        
        results = []
        successful = 0
        failed = 0
        
        for file in files:
            if file.filename == '':
                continue
            
            if not allowed_file(file.filename):
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': 'Not a GIF file'
                })
                failed += 1
                continue
            
            # Generate unique filenames
            file_id = str(uuid.uuid4())
            secure_name = secure_filename(file.filename)
            input_filename = f"{file_id}_{secure_name}"
            input_path = os.path.join(UPLOAD_FOLDER, input_filename)
            
            file.save(input_path)
            
            output_filename = f"{file_id}_output.webm"
            output_path = os.path.join(UPLOAD_FOLDER, output_filename)
            
            print(f"Converting {secure_name} (bulk)")
            
            original_size = os.path.getsize(input_path)
            
            # Perform conversion
            success = convert_gif_to_webm(
                input_path=input_path,
                output_path=output_path,
                mode=mode,
                max_size_kb=max_size_kb
            )
            
            if success and os.path.exists(output_path):
                output_size = os.path.getsize(output_path)
                
                results.append({
                    'filename': secure_name,
                    'success': True,
                    'output_filename': f"{Path(secure_name).stem}_{mode}.webm",
                    'original_size_kb': round(original_size / 1024, 1),
                    'output_size_kb': round(output_size / 1024, 1),
                    'compression_ratio': round((1 - output_size / original_size) * 100, 1),
                    'download_id': file_id
                })
                successful += 1
                
                try:
                    os.remove(input_path)
                except:
                    pass
            else:
                results.append({
                    'filename': secure_name,
                    'success': False,
                    'error': f'Could not compress under {max_size_kb}KB'
                })
                failed += 1
                
                try:
                    os.remove(input_path)
                    if os.path.exists(output_path):
                        os.remove(output_path)
                except:
                    pass
        
        return jsonify({
            'total': len(files),
            'successful': successful,
            'failed': failed,
            'results': results
        })
    
    except Exception as e:
        print(f"Bulk conversion error: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Starting GIF to WebM Converter Server...")
    print(f"📁 Upload folder: {os.path.abspath(UPLOAD_FOLDER)}")
    print(f"📊 Max file size: {MAX_FILE_SIZE // (1024*1024)}MB")
    print(f"🔧 FFmpeg available: {check_ffmpeg() if HAS_CONVERTER else 'Unknown'}")
    print(f"🔄 Converter available: {HAS_CONVERTER}")
    print()
    print("🌐 Server will be available at: http://127.0.0.1:5000 (behind Nginx)")
    print("🔧 Public API endpoint: https://api.piogino.ch/api/convert")
    print()
    
    app.run(debug=False, host='127.0.0.1', port=5000)
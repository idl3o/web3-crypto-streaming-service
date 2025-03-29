const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

// Configuration
const inputDir = path.join(__dirname, '../content/input');
const outputDir = path.join(__dirname, '../content/output');
const manifestDir = path.join(__dirname, '../content/manifest');

// Ensure directories exist
[inputDir, outputDir, manifestDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Check if FFmpeg is installed
async function checkFFmpeg() {
    return new Promise((resolve) => {
        const ffmpeg = spawn('ffmpeg', ['-version']);

        ffmpeg.on('error', () => {
            console.error('❌ FFmpeg is not installed or not in PATH');
            console.error('Please install FFmpeg: https://ffmpeg.org/download.html');
            resolve(false);
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log('✅ FFmpeg is installed');
                resolve(true);
            } else {
                console.error('❌ FFmpeg check failed');
                resolve(false);
            }
        });
    });
}

// Convert video to HLS
async function convertToHLS(inputFile, outputName) {
    const outputPath = path.join(outputDir, outputName);
    const manifestPath = path.join(manifestDir, `${outputName}.m3u8`);

    return new Promise((resolve, reject) => {
        console.log(`Converting ${inputFile} to HLS format...`);

        const ffmpeg = spawn('ffmpeg', [
            '-i', inputFile,
            '-profile:v', 'baseline', // Baseline profile for compatibility
            '-level', '3.0',
            '-start_number', '0',
            '-hls_time', '10', // 10 second segments
            '-hls_list_size', '0', // Keep all segments in the playlist
            '-f', 'hls',
            manifestPath
        ]);

        ffmpeg.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        ffmpeg.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`); // FFmpeg outputs progress to stderr
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Successfully converted ${inputFile} to HLS`);
                resolve({
                    manifestPath,
                    outputPath
                });
            } else {
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });
    });
}

// Calculate file hash
function calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

// Scan input directory for videos
async function processVideos() {
    try {
        const hasFFmpeg = await checkFFmpeg();
        if (!hasFFmpeg) {
            return;
        }

        const files = fs.readdirSync(inputDir);
        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
        });

        if (videoFiles.length === 0) {
            console.log('No video files found in the input directory.');
            console.log(`Please place video files in: ${inputDir}`);
            return;
        }

        console.log(`Found ${videoFiles.length} video files to process.`);

        for (const file of videoFiles) {
            const inputPath = path.join(inputDir, file);
            const outputName = path.parse(file).name.toLowerCase().replace(/\s+/g, '-');
            const fileHash = await calculateFileHash(inputPath);
            const shortHash = fileHash.substring(0, 8);

            try {
                const { manifestPath } = await convertToHLS(inputPath, `${outputName}-${shortHash}`);
                console.log(`Created manifest at: ${manifestPath}`);

                // Generate metadata
                const metadata = {
                    originalFile: file,
                    hash: fileHash,
                    manifestPath: path.relative(process.cwd(), manifestPath),
                    createdAt: new Date().toISOString()
                };

                fs.writeFileSync(
                    path.join(manifestDir, `${outputName}-${shortHash}.json`),
                    JSON.stringify(metadata, null, 2)
                );

            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        }

        console.log('✅ Video processing complete!');

    } catch (err) {
        console.error('Error processing videos:', err);
    }
}

// Run the script
processVideos();

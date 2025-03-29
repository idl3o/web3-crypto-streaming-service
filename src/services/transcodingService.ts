// Transcoding service for optimizing media files before upload
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

// Check if FFmpeg WASM is supported
const isFFmpegSupported = () => {
  return typeof SharedArrayBuffer !== 'undefined'
}

// Initialize FFmpeg
let ffmpeg: FFmpeg | null = null

async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) {
    return ffmpeg
  }
  
  try {
    ffmpeg = new FFmpeg()
    
    // Load FFmpeg WASM
    await ffmpeg.load({
      coreURL: '/ffmpeg-core.js',
      wasmURL: '/ffmpeg-core.wasm'
    })
    
    console.log('FFmpeg initialized successfully')
    return ffmpeg
  } catch (error) {
    console.error('Failed to load FFmpeg:', error)
    throw new Error('Failed to initialize FFmpeg')
  }
}

// Transcode video to optimized formats
export async function transcodeVideo(
  videoFile: File, 
  options: {
    height?: number,
    bitrate?: string,
    format?: string
  } = {}
): Promise<File[]> {
  if (!isFFmpegSupported()) {
    console.warn('FFmpeg is not supported in this browser, returning original file')
    return [videoFile]
  }

  try {
    const instance = await initFFmpeg()
    
    // Set default options
    const height = options.height || 720
    const bitrate = options.bitrate || '1000k'
    const format = options.format || 'mp4'
    
    // Input filename
    const inputFileName = 'input.' + videoFile.name.split('.').pop()
    
    // Output filenames
    const outputFileNames = [`output-${height}p.${format}`]
    
    // Write the input file to FFmpeg virtual file system
    instance.writeFile(inputFileName, await fetchFile(videoFile))
    
    // Run FFmpeg command to transcode the video
    await instance.exec([
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-vf', `scale=-1:${height}`,
      '-b:v', bitrate,
      outputFileNames[0]
    ])
    
    // Read output file from FFmpeg virtual file system
    const transcoded = await instance.readFile(outputFileNames[0])
    
    // Create a new File object
    const transcodedFile = new File(
      [transcoded], 
      `${videoFile.name.split('.')[0]}-${height}p.${format}`,
      { type: `video/${format}` }
    )
    
    return [transcodedFile]
  } catch (error) {
    console.error('Error transcoding video:', error)
    return [videoFile] // Return original file if transcoding fails
  }
}

// Create thumbnail from video
export async function createThumbnail(videoFile: File): Promise<File | null> {
  if (!isFFmpegSupported()) {
    console.warn('FFmpeg is not supported in this browser')
    return null
  }
  
  try {
    const instance = await initFFmpeg()
    
    // Input filename
    const inputFileName = 'input.' + videoFile.name.split('.').pop()
    
    // Output thumbnail filename
    const thumbnailFileName = 'thumbnail.jpg'
    
    // Write the input file to FFmpeg virtual file system
    instance.writeFile(inputFileName, await fetchFile(videoFile))
    
    // Extract a frame at 10% of the video duration
    await instance.exec([
      '-i', inputFileName,
      '-ss', '00:00:03',
      '-frames:v', '1',
      thumbnailFileName
    ])
    
    // Read the thumbnail file from FFmpeg virtual file system
    const thumbnailData = await instance.readFile(thumbnailFileName)
    
    // Create a new File object for the thumbnail
    return new File(
      [thumbnailData], 
      `${videoFile.name.split('.')[0]}-thumbnail.jpg`,
      { type: 'image/jpeg' }
    )
  } catch (error) {
    console.error('Error creating thumbnail:', error)
    return null
  }
}

export default {
  isFFmpegSupported,
  initFFmpeg,
  transcodeVideo,
  createThumbnail
}

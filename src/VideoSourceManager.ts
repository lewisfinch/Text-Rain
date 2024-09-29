/** CSci-4611 Assignment 1 Support Code
 * Assignment concept and support code by Prof. Daniel Keefe, 2023
 * Inspired by Camille Utterbeck's "Text Rain" installation, 2000+
 * Copyright Regents of the University of Minnesota
 * Please do not distribute beyond the CSci-4611 course
 */


/**
 * This class handles querying and selecting between several possible sources for
 * video frames.  The fallback option is to load a local video file.  It is also
 * possible to stream image data from a webcam.  The class maintains a list of
 * all available sources and treats one of them as the "currentVideoSource".
 * The currentVideoSource defaults to the fallback video file.  As soon as another
 * source is made current, it starts playing.  To access the image data use:
 * ```
 *   const imageData = videoSourceManager.currentVideoSource.getImageData();
 * ```
 */
export class VideoSourceManager
{
    private readonly UNKNOWN_VIDEO_DEVICE = 'Unknown Video Device';
    // special reader for the FALLBACK_VIDEO file
    private fallbackVideoSource: VideoFileFrameReader;  
    // array of streaming readers, one per webcam detected
    private cameraVideoSources: Array<CameraStreamFrameReader>;
    private _currentVideoSource: VideoFrameReader;
    private _sourceDictionary: { [key: string]: string };

    // dictionary of sources (i.e., sourceMap[deviceLabel] = deviceId)
    public get sourceDictionary() {
        return this._sourceDictionary;
    }

    // the currently selected video reader, which will be either fallbackVideoSource or one
    // of the cameraVideoSources
    public get currentVideoSource() {
        return this._currentVideoSource;
    }

    public set currentVideoSource(newSource: VideoFrameReader)
    {
        if (newSource instanceof CameraStreamFrameReader) {
            if (this._currentVideoSource != newSource) {
                // stop the current video, switch to the new source, and play it
                this._currentVideoSource.stop();
                this._currentVideoSource = newSource;
                this._currentVideoSource.play();
            }
        } else {
            // stop the current video, switch to the fallback video file, and play it
            this._currentVideoSource.stop();
            this._currentVideoSource = this.fallbackVideoSource;
            this._currentVideoSource.play();
        }
    }

    // get/set by the source's deviceId rather than the source object
    public get currentVideoSourceId(): string
    {
        if (this._currentVideoSource instanceof CameraStreamFrameReader) {
            return this._currentVideoSource.deviceInfo.deviceId;
        } else if (this._currentVideoSource instanceof VideoFileFrameReader) {
            return this._currentVideoSource.videoFileName;
        } else {
            return this.UNKNOWN_VIDEO_DEVICE;
        }
    }

    public set currentVideoSourceId(value: string)
    {
        // see if there is a streaming video reader with the newDeviceId specified 
        const newSource = this.cameraVideoSources.find((source) => source.deviceInfo.deviceId == value);
        if (newSource instanceof CameraStreamFrameReader) {
            this.currentVideoSource = newSource;
        } else {
            this.currentVideoSource = this.fallbackVideoSource;
        }
    }

    // specify a callback in the second argument to be notified when a list of webcams becomes available
    constructor(fallbackVideo: string, onSourcesEnumerated: (sourceMap: { [key: string]: string }) => void | null) {
        // initially the only source is the fallback video
        this._sourceDictionary = {};
        this._sourceDictionary[fallbackVideo] = fallbackVideo;

        this.fallbackVideoSource = new VideoFileFrameReader(fallbackVideo);

        this._currentVideoSource = this.fallbackVideoSource;
        this._currentVideoSource.play();

        this.cameraVideoSources = [];
        navigator.mediaDevices.enumerateDevices()
            .then((devices) => {       
                // add new sources for each video device found         
                const videoDevices = devices.filter(device => device.kind === 'videoinput');                    
                videoDevices.forEach((device) => {
                    this.cameraVideoSources.push(new CameraStreamFrameReader(device));
                    const label = device.label || this.UNKNOWN_VIDEO_DEVICE;
                    this._sourceDictionary[label] = device.deviceId;
                })
                // inform listeners by calling the callback function if provided
                if (onSourcesEnumerated != null) {
                    onSourcesEnumerated(this._sourceDictionary);
                }
            })
            .catch((reason) => { 
                    console.error(reason);
            })
    }
}




/**
 * An abstract base class for Video Frame Readers that can play and pause video streams 
 * in an offscreen buffer and provide read access to the current video frame's pixel data.
 * Two concrete implementations of the class are currently provided, WebCamVideoFrameProvider
 * works with a webcam, and VideoFileFrameReader works with a looping video file.  
 */
export abstract class VideoFrameReader
{
    protected canvasEl: HTMLCanvasElement;
    protected videoEl: HTMLVideoElement;
    protected rendCtx: CanvasRenderingContext2D | null;
    protected _canPlay: boolean;
    protected _isPlaying: boolean;


    public get canPlay()
    {
        return this._canPlay;
    }

    public get isPlaying()
    {
        return this._isPlaying;
    }

    constructor()
    {
        this._canPlay = false;
        this._isPlaying = false;

        // create an offscreen canvas element, used to write/read video frames 
        this.canvasEl = document.createElement('canvas') as HTMLCanvasElement;
        this.rendCtx = this.canvasEl.getContext('2d');

        // create an offscreen html video element, used to play the video
        this.videoEl = document.createElement('video') as HTMLVideoElement;
        this.videoEl.muted = true;
        this.videoEl.crossOrigin = 'Anonymous';
        this.videoEl.playsInline = true;
        this.videoEl.addEventListener('loadedmetadata', () => {
            this.videoEl.width = this.videoEl.videoWidth;
            this.videoEl.height = this.videoEl.videoHeight;
            this.canvasEl.width = this.videoEl.videoWidth;
            this.canvasEl.height = this.videoEl.videoHeight;
        })
        this.videoEl.addEventListener('canplay', () => {
            this._canPlay = true;
        })
        this.videoEl.addEventListener('playing', () => {
            this._isPlaying = true;
        })
        this.videoEl.addEventListener('pause', () => {
            this._isPlaying = false;
        })
        this.videoEl.addEventListener('ended', () => {
            this._isPlaying = false;
        })
    }

    public abstract play(): void;
    public abstract stop(): void;

    public getImageData(): ImageData | null
    {
        // We cannot read pixel data directly from the HTMLVideoElement, but the HTMLCanvasElement
        // provides a way to draw the current video frame onto it, and once it is there, we can access 
        // the pixel data of the canvas. 

        // draw latest video frame into the canvas
        if (this.rendCtx instanceof CanvasRenderingContext2D && this._isPlaying && this.videoEl.videoWidth != 0) {
            this.canvasEl.width = this.videoEl.videoWidth;
            this.canvasEl.height = this.videoEl.videoHeight;
            this.rendCtx.drawImage(this.videoEl, 0, 0);
        }

        // return the image data from the canvas or null if its is not available or ready
        if (this.rendCtx instanceof CanvasRenderingContext2D && this.canvasEl.width != 0 && this.canvasEl.height != 0) {
            return this.rendCtx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height);
        } else {
            return null;
        }
    }
}

/* Opens a local webcam video stream and provides access to the pixel data for the current frame.
*/
export class CameraStreamFrameReader extends VideoFrameReader
{
    private _deviceInfo: MediaDeviceInfo;
    private initialized: boolean;
    private stream: MediaStream | undefined;

    public get deviceInfo() {
        return this._deviceInfo;
    }

    constructor(deviceInfo: MediaDeviceInfo) 
    {
        super();
        this._deviceInfo = deviceInfo;
        this.initialized = false;
        this.stream = undefined;
    }

    public play(): void
    {
        if (!this.initialized) {
            const anyVideoDevice = { 
                audio: false, 
                video: { 
                    width: { ideal: 320 },
                    height: { ideal: 280 },
                    framerate: { ideal: 10 }, 
                }
            };
            const exactVideoDevice = { 
                audio: false, 
                video: { 
                    width: { ideal: 320 },
                    height: { ideal: 280 },
                    framerate: { ideal: 10 }, 
                    deviceId: { 
                        exact: this._deviceInfo.deviceId 
                    } 
                }
            };

            let constraints = anyVideoDevice;
            if (this._deviceInfo.deviceId != '') {
                constraints = exactVideoDevice;
            }
            navigator.mediaDevices.getUserMedia(constraints)
                .then((stream: MediaStream) => {
                    //console.log("Starting video stream on " + this._deviceInfo.label + "(" + this._deviceInfo.deviceId + ")");
                    this.stream = stream;
                    this.videoEl.srcObject = stream;
                    this.initialized = true;
                    this.videoEl.play();
                })
                .catch((e) => { 
                    console.log("Error starting video stream on " + this._deviceInfo.label + "(" + this._deviceInfo.deviceId + ")"); 
                    console.error(e); 
                });
        }
    }

    public stop(): void
    {
        //console.log("Stopping video stream on " + this._deviceInfo.label + "(" + this._deviceInfo.deviceId + ")");
        if (this.stream instanceof MediaStream) {
            this.stream.getTracks().forEach((track) => {
                track.stop();
            })
        }
        this.videoEl.srcObject = null;
        this.initialized = false;
        this._isPlaying = false;
        this._canPlay = false;
    }
}


/* Plays a local video file on loop and provides access to the pixel data for the current frame.
*/
export class VideoFileFrameReader extends VideoFrameReader
{
    private initialized: boolean;
    private _videoFileName: string;
    private _duration: number;

    public get videoFileName()
    {
        return this._videoFileName;
    }

    public get duration()
    {
        return this._duration;
    }

    constructor(videoFileName: string) 
    {
        super();
        this.initialized = false;
        this._videoFileName = videoFileName;
        this._duration = 0;
    }

    public play(): void
    {
        if (!this.initialized) {
            this.videoEl.src = this._videoFileName;

            // these listeners are a bit of a hack to implement video looping.  normally setting the loop
            // attribute of the video element is all that is needed to loop the video.  however, when
            // playing the video through a second time, a cross-origin error is generated when trying to
            // read the video frames from the canvas.  it is not clear (to me) why this works fine the
            // first time the video is played but not the second time the video is played.  however, we
            // can avoid the issue by reloading the video when it nears the end rather than using the
            // built-in looping.
            this.videoEl.addEventListener('durationchange', () => {
                // save the duration of the video once this value is set by loading a video
                this._duration = this.videoEl.duration;
            })
            this.videoEl.addEventListener('timeupdate', () => {
                // if within 1 second of the end of the video, then restart it video. 1 second is used
                // because there is no way to reliably get a callback on the very last frame of the video,
                // and the cross-origin error will occur the moment the video ends.
                if (this._duration != 0 && this.videoEl.currentTime >= this._duration - 1) {
                    this.stop();
                    this.play();
                    //this._videoEl.load();
                }
            })
            this.initialized = true;
        }
        
        if (this.initialized) {
            //console.log("Starting video file playback (" + this._videoFileName + ")");
            this.videoEl.play();
        }
    }

    public stop(): void
    {
        //console.log("Stopping video file playback (" + this._videoFileName + ")");
        this.videoEl.pause(); 
        this.videoEl.src = '';
        this.initialized = false;
    }
}

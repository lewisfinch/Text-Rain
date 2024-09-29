/** CSci-4611 Assignment 1 Support Code
 * Assignment concept and support code by Prof. Daniel Keefe, 2023
 * Inspired by Camille Utterbeck's "Text Rain" installation, 2000+
 * Copyright Regents of the University of Minnesota
 * Please do not distribute beyond the CSci-4611 course
 */

import * as gfx from 'gophergfx'
import { GUI, GUIController } from 'dat.gui'
import { VideoSourceManager } from './VideoSourceManager';
import { ImageUtils } from './ImageUtils';

export class RainingApp extends gfx.GfxApp {
    // --- constants ---
    private readonly FALLBACK_VIDEO = './TextRainInput.m4v';
    private readonly OPEN_SETTINGS_LABEL_TEXT = '▼ Open Settings';
    private readonly CLOSE_SETTINGS_LABEL_TEXT = '▲ Close Settings';


    // --- GUI related member vars ---
    // the gui object created using the dat.gui library.
    private gui: GUI;
    // the gui controllers defined in the constructor are tied to these member variables, so these
    // variables will update automatically whenever the checkboxes, sliders, etc. in the gui are changed.
    private _debugging: boolean;
    private _threshold: number;
    // the video source is also controlled by the GUI, but the logic is a bit more complex as we
    // do not know the names of the video devices until we are given permission to access them.  so,
    // we save a reference to the GUIController and option list in addition to the currentVideoDevice
    // variable that gets updated when the user changes the device via the gui.
    private videoSourceDropDown: GUIController;


    // --- Graphics related member vars ---
    private videoSourceManager: VideoSourceManager;
    private displayImage: ImageData | null;
    private obstacleImage: ImageData | null;
    private backgroundRect: gfx.Mesh2 | null;
    private raindropsParentNode: gfx.Node2;

    private drops_num = 0;
    private raindrops: gfx.Mesh2[] = [];
    private raindrops_cords: number[][] = [];
    private blocked: boolean[] = [];
    private colors: gfx.Color[] = [gfx.Color.RED, gfx.Color.BLUE, gfx.Color.GREEN, gfx.Color.YELLOW, gfx.Color.CYAN, gfx.Color.PURPLE];
    private color_changed: boolean[] = [];
    private spawn_period = 0;
    private raindrops_yvectors: number[] = [];
    private raindrops_xvectors: number[] = [];

    //====================================================================================================
    //Part 4.1 Select characters/words to display from some meaningful text (e.g., a poem, a song) 
    // that fits aesthetically with your vision for the user experience.


    //the word array that will be used to create the text rain
    private readonly wordArray = (
        `I never meant to cause you any sorrow
         I never meant to cause you any pain
         I only wanted one time to see you laughing
         I only wanted to see you
         Laughing in the purple rain
         Purple rain, purple rain
         I only want to see you
         Laughing in the purple rain`
    ).split(" ");
    //====================================================================================================

    // --- Getters and setters ---
    // any variables that can be changed from outside the class, including by the GUI, need to either be
    // declared public rather than private (this is usually faster to code and generally ok for small
    // projects) OR have getters & setters defined as below (this is generally better / safer practice).
    public get debugging() {
        return this._debugging;
    }

    public set debugging(value: boolean) {
        this._debugging = value;
    }

    public get threshold() {
        return this._threshold;
    }

    public set threshold(value: number) {
        this._threshold = value;
    }


    // --- Constructor ---
    // note: typescripts requires that we initialize all member variables in the constructor.
    constructor() {


        // initialize the base class gfx.GfxApp
        super();

        // this writes directly to some variables within the dat.gui library. the library does not
        // provide a nicer way to customize the text for the buttons used to open/close the gui.
        GUI.TEXT_CLOSED = this.CLOSE_SETTINGS_LABEL_TEXT;
        GUI.TEXT_OPEN = this.OPEN_SETTINGS_LABEL_TEXT;

        // initialize all member variables
        this._debugging = false;
        this._threshold = 0.5;
        this.displayImage = null;
        this.obstacleImage = null;
        this.backgroundRect = null;

        this.raindropsParentNode = new gfx.Node2();

        this.videoSourceManager = new VideoSourceManager(this.FALLBACK_VIDEO,
            // video sources are loaded asynchronously, and this little callback function
            // is called when the loading finishes to update the choices in the GUI dropdown
            (newSourceDictionary: { [key: string]: string }) => {
                this.videoSourceDropDown.options(newSourceDictionary);
            });

        // initialize the gui and add various controls
        this.gui = new GUI({ width: 300, closed: false });

        // create a dropdown list to select the video source; initially the only option is the
        // fallback video, more options are added when the VideoSourceManager is done loading
        const videoDeviceOptions: { [key: string]: string } = {};
        videoDeviceOptions[this.FALLBACK_VIDEO] = this.FALLBACK_VIDEO;
        this.videoSourceDropDown = this.gui.add(this.videoSourceManager, 'currentVideoSourceId', videoDeviceOptions);

        // this creates a checkbox for the debugging member variable
        const debuggingCheckbox = this.gui.add(this, 'debugging');

        // this creates a slider to set the value of the threshold member variable
        const thresholdSlider = this.gui.add(this, 'threshold', 0, 1);

    }

    // --- Initialize the Graphics Scene ---
    createScene(): void {
        // This parameter zooms in on the scene to fit within the window.
        // Other options include FIT or STRETCH.
        this.renderer.viewport = gfx.Viewport.CROP;

        // To see the texture to the scene, we need to apply it as a material to some geometry.
        // in this case, we'll create a big rectangle that fills the entire screen (width = 2, height = 2).
        this.backgroundRect = gfx.Geometry2Factory.createBox(2, 2);

        // Add all the objects to the scene--Order is important!
        // Objects that are added later will be rendered on top of objects that are added first.
        this.scene.add(this.backgroundRect);
        this.scene.add(this.raindropsParentNode);
    }


    // --- Update routine called once each frame by the main graphics loop ---
    update(deltaTime: number): void {
        const latestImage = this.videoSourceManager.currentVideoSource.getImageData();
        if (latestImage instanceof ImageData) {

            const width = latestImage.width;
            const height = latestImage.height;

            this.displayImage = ImageUtils.createOrResizeIfNeeded(this.displayImage, width, height);
            this.obstacleImage = ImageUtils.createOrResizeIfNeeded(this.obstacleImage, width, height);

            if (this.displayImage instanceof ImageData && this.obstacleImage instanceof ImageData) {

                // At this point, we know latestImage, this.displayImage, and this.obstacleImage are all
                // created and have the same width and height.  The pixels in latestImage will contain the
                // latest data from the camera and this.displayImage and this.obstacleImage are both
                // blank images (all pixels are black).

                //====================================================================================================
                //TODO: Part 2 Image Processing
                //Uncomment the following code and provide the appropriate parameters after completing the functions for Part 2
                ImageUtils.mirror(latestImage, this.displayImage);
                ImageUtils.convertToGrayscaleInPlace(this.displayImage);
                ImageUtils.threshold(this.displayImage, this.obstacleImage, this._threshold);

                //Remove the following line after completing Part 2
                // ImageUtils.copyPixels(latestImage, this.displayImage);
                //====================================================================================================

                // Texture the backgroundRect with either the displayImage or the obstacleImage
                if (this.backgroundRect instanceof gfx.Mesh2) {
                    let imageToDraw = this.displayImage;

                    if (this.debugging) {
                        imageToDraw = this.obstacleImage;
                    }

                    if (this.backgroundRect.material.texture == null ||
                        this.backgroundRect.material.texture.width != width ||
                        this.backgroundRect.material.texture.height != height) {
                        // We need to create a new texture and assign it to our backgroundRect
                        this.backgroundRect.material.texture = new gfx.Texture(imageToDraw);
                    } else {
                        // Otherwise, the appropriate texture already exists and we need to update its pixel array
                        this.backgroundRect.material.texture.setFullImageData(imageToDraw);
                    }
                }

                //====================================================================================================
                //TODO: Part 1.2 Raindrop Spawning
                //In order to prevent infinite raindrops, we will want to limit the total number of raindrops.
                //We may also want to wait a certain amount of time between spawning raindrops--remember that update runs every frame.
                if (this.drops_num < 100) {
                    if (this.spawn_period == 5) {
                        this.spawnRaindrop();
                        this.spawn_period = 0;
                    }
                    else {
                        this.spawn_period++;
                    }
                }
                //====================================================================================================

                //====================================================================================================
                //TODO: Part 1.3 Basic Rain Animation & Recycling
                //Iterate through each raindrop and position it according to its velocity and deltaTime assuming nothing is in its way
                //Then we should check if the raindrop has fallen off of the screen and needs to be removed or repositioned
                // ADD YOUR CODE HERE
                for (let i = 0; i < this.raindrops.length; i++) {
                    if (this.blocked[i] == false) {
                        var yspeed = this.raindrops_yvectors[i];
                        if (this.raindrops_yvectors[i] > -1) {
                            yspeed -= 0.01;
                        }
                        this.raindrops_yvectors[i] = yspeed;
                        if (this.raindrops_yvectors[i] > -0.001)
                            this.raindrops[i].scale = new gfx.Vector2(1, (-this.raindrops_yvectors[i] + 0.9));
                        else {
                            this.raindrops[i].scale = new gfx.Vector2(1, 1);
                        }
                        var raindropVelocity = new gfx.Vector2(this.raindrops_xvectors[i], yspeed * deltaTime);
                        this.raindrops[i].position.add(raindropVelocity);
                        if (this.raindrops[i].position.y < -1.2) {
                            this.raindrops[i].position.y = 1.2;
                            this.color_changed[i] = false;
                            this.raindrops[i].material.color = gfx.Color.BLACK;
                            var ran_pos = this.randomIntFromInterval(-100, 100);
                            this.raindrops[i].position.x = ran_pos / 100;
                        }

                    }
                }

                //====================================================================================================


                //====================================================================================================
                //TODO: Part 3.2 Convert Coordinates
                //convert the raindrop's position to a col,row within the image using the appropriate functions

                // ADD YOUR CODE HERE
                for (let i = 0; i < this.raindrops.length; i++) {
                    var cord = [this.sceneXtoImageColumn(this.raindrops[i].position.x, width), this.sceneYtoImageRow(this.raindrops[i].position.y, height)];
                    this.raindrops_cords[i] = cord;
                }

                //====================================================================================================


                //====================================================================================================
                //TODO: Part 3.3 Respond to Obstacles
                // Iterate through each raindrop and check if it encounters an obstacle
                // First, we need to make sure the raindrop is over the image (if not, we can assume it is off screen)
                // Then, we need to check if the obstacleImage at the raindrop's position is a dark region 
                //(the helper functions in Image Utils may be useful)
                // If it is, we should keep the raindrop from falling any further


                // ADD YOUR CODE HERE
                for (let i = 0; i < this.raindrops.length; i++) {
                    if (this.raindrops[i].position.y < 1 && this.raindrops[i].position.y > -1
                        && this.raindrops[i].position.x < 1 && this.raindrops[i].position.x > -1) {
                        var cord_x = this.raindrops_cords[i][0];
                        var cord_y = this.raindrops_cords[i][1];
                        if (ImageUtils.getRed(this.obstacleImage, cord_x, cord_y) == 0) {
                            if (this.raindrops_yvectors[i] < -0.001) {
                                this.raindrops_yvectors[i] = -this.raindrops_yvectors[i] / 4;
                            }
                            if (this.raindrops_xvectors[i] < -0.001 && (this.raindrops_xvectors[i] > 0.001)) {
                                this.raindrops_xvectors[i] = -this.raindrops_xvectors[i] / 100;
                            }
                            this.blocked[i] = true;
                        }
                        else { this.blocked[i] = false; }
                    }
                }
                for (let i = 0; i < this.blocked.length; i++) {
                    if (this.raindrops[i].position.y > 1) {
                        this.blocked[i] = false;
                    }
                }

                //====================================================================================================

                //====================================================================================================
                //TODO: Part 3.4 Advanced Response to Obstacles
                // Extend or modify the logic from Part 3.3 to push the raindrop above dark regions
                // Raindrops will need to move up and down as the video changes to respond to obstacles 

                // ADD YOUR CODE HERE
                var rainRaiseVelocity = new gfx.Vector2(0, 0.01 * deltaTime);
                for (let i = 0; i < this.raindrops.length; i++) {
                    if (this.blocked[i] == true) {

                        this.raindrops[i].position.add(rainRaiseVelocity);

                        if (this.raindrops[i].position.y > 1.2) {
                            this.raindrops[i].position.y = 1.2;
                        }

                        const cord_x = this.raindrops_cords[i][0];
                        var cord_y = this.raindrops_cords[i][1];
                        while (ImageUtils.getRed(this.obstacleImage, cord_x, cord_y) == 0) {
                            this.raindrops[i].position.add(rainRaiseVelocity);
                            this.raindrops_yvectors[i] += 0.0003;
                            cord_y = this.sceneYtoImageRow(this.raindrops[i].position.y, height);
                        }

                    }
                }

                //====================================================================================================

                //====================================================================================================
                //TODO: Part 4.2 Advanced Obstacle Animation
                // Add at least one animation to the raindrops, background image, or another object
                // that occurs when the letters encounter obstacles
                var rainLeftVelocity = new gfx.Vector2(-0.07 * deltaTime, 0);
                var rainRightVelocity = new gfx.Vector2(0.07 * deltaTime, 0);
                for (let i = 0; i < this.raindrops.length; i++) {
                    if (this.blocked[i] == true) {
                        if (this.color_changed[i] == false) {
                            var ran_word = this.randomIntFromInterval(0, this.wordArray.length - 1);
                            var word = this.wordArray[ran_word];
                            while (word == "") {
                                ran_word = this.randomIntFromInterval(0, this.wordArray.length - 1);
                                word = this.wordArray[ran_word];
                            }
                            var ran_color = this.randomIntFromInterval(0, this.colors.length - 1);
                            var color = this.colors[ran_color];
                            this.raindrops[i].material.color = color;
                            this.color_changed[i] = true;
                        }
                        const cord_x = this.raindrops_cords[i][0];
                        const cord_y = this.raindrops_cords[i][1];

                        for (let j = 0; j < 10; j++) {
                            if (ImageUtils.getRed(this.obstacleImage, cord_x - j, cord_y + 1) == 0 && cord_x > 0) {
                                this.raindrops[i].position.add(rainRightVelocity);
                                this.raindrops[i].rotation -= 0.1;
                                this.raindrops_xvectors[i] += 0.0001;
                            }
                            if (ImageUtils.getRed(this.obstacleImage, cord_x + j, cord_y + 1) == 0 && cord_x < width) {
                                this.raindrops[i].position.add(rainLeftVelocity);
                                this.raindrops[i].rotation += 0.1;
                                this.raindrops_xvectors[i] -= 0.0001;

                            }
                        }

                        // if (ImageUtils.getRed(this.obstacleImage, cord_x - 1, cord_y - 1) == 255) {
                        //     this.raindrops[i].position.add(rainLeftVelocity);
                        //     this.raindrops[i].position.add(raindropVelocity);
                        // } else if (ImageUtils.getRed(this.obstacleImage, cord_x + 1, cord_y - 1) == 255) {
                        //     this.raindrops[i].position.add(rainRightVelocity);
                        //     this.raindrops[i].position.add(raindropVelocity);
                        // }
                    }
                }
                //====================================================================================================  

                //BOMB


            }
        }
    }

    // --- Additional Class Member Functions ---

    randomIntFromInterval(min: number, max: number) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    private spawnRaindrop(): void {
        //====================================================================================================
        //TODO: PART 1.1 Raindrop Creation
        //We should choose a random word from the wordList
        //For each letter in the word, we need to spawn a raindrop geometry on the appropriate node
        //At random locations along the X-axis and at the appropriate Y-axis position 
        //We need to apply a Text texture to the raindrop material using the current letter
        var ran_word = this.randomIntFromInterval(0, this.wordArray.length - 1);
        var word = this.wordArray[ran_word];
        var ran_pos = this.randomIntFromInterval(-100, 100);
        while (word == "") {
            ran_word = this.randomIntFromInterval(0, this.wordArray.length - 1);
            word = this.wordArray[ran_word];
        }
        for (let i = 0; i < word.length; i++) {
            var raindrop = gfx.Geometry2Factory.createBox(0.08, 0.08);
            raindrop.position.y = 1.2;
            raindrop.position.x = (ran_pos / 100) + i / 30;
            raindrop.material.texture = new gfx.Text(word[i], 90, 90, "50px monospace", "white", "", "", 1, "center", "middle");
            raindrop.material.color = gfx.Color.BLACK;
            this.raindrops.push(raindrop);
            this.scene.add(raindrop);
            this.blocked.push(false);
            this.color_changed.push(false);
            this.drops_num += 1;
            this.raindrops_yvectors.push(0);
            this.raindrops_xvectors.push(0);
        }
        //====================================================================================================
    }

    //====================================================================================================
    //TODO: Part 3.1 Scene <-> Image Coordinate Conversion
    //Complete the following four functions to convert between scene coordinates and image coordinates
    sceneXtoImageColumn(x: number, imageWidth: number): number {
        var pos_x = x + 1;
        const ratio = imageWidth / 2;
        return Math.floor(pos_x * ratio);
    }

    sceneYtoImageRow(y: number, imageHeight: number): number {
        var pos_y = y + 1;
        const ratio = imageHeight / 2;
        return imageHeight - Math.floor(pos_y * ratio);
    }

    imageColumnToSceneX(col: number, imageWidth: number): number {
        const ratio = imageWidth / 2;
        return (col / ratio) - 1;
    }

    imageRowToSceneY(row: number, imageHeight: number): number {
        const ratio = imageHeight / 2;
        return (row / ratio) - 1;
    }
    //====================================================================================================
}
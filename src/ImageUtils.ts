/** CSci-4611 Assignment 1 Support Code
 * Assignment concept and support code by Prof. Daniel Keefe, 2023
 * Inspired by Camille Utterbeck's "Text Rain" installation, 2000+
 * Copyright Regents of the University of Minnesota
 * Please do not distribute beyond the CSci-4611 course
 */

import * as gfx from 'gophergfx'

/**
 * A collection of helper routines for working with images stored in ImageData objects.
 * Feel free to add additional routines (e.g., image filters) if you like.  (We did in
 * our implementation.)
 */
export class ImageUtils {
    /**
     * Creates a new ImageData object of the specified width and height.  Every byte in the data array
     * will be be initialized to 0 (i.e., black completely transparent pixels).
     */
    public static createBlank(width: number, height: number): ImageData {
        const nBytes = width * height * 4;
        return new ImageData(new Uint8ClampedArray(nBytes), width, height);
    }

    /**
     * Checks the image variable to determine if has already been created, then checks to see if it has
     * the desired width and height.  If these checks pass, then the function returns the existing image.
     * If either check fails, then the function creates a new ImageData object of the desired width and 
     * height and returns it.  In this case, the image will be initialized using ImageUtils.createBlank().   
     * @param image Can be null, undefined, or an existing image
     * @param width The desired width of the image
     * @param height The desired height of the image
     * @returns The current image if it matches the desired width and height or a new image that matches
     */
    public static createOrResizeIfNeeded(image: ImageData | undefined | null, width: number, height: number): ImageData {
        if (!(image instanceof ImageData) || image.width != width || image.height != height) {
            return this.createBlank(width, height);
        } else {
            return image;
        }
    }

    /**
     * Returns a new ImageData object that is a deep copy of the source image provided.  This includes copying
     * all of the pixel data from the source to the new image object.
     */
    public static clone(source: ImageData): ImageData {
        const copyOfPixelData = new Uint8ClampedArray(source.data);
        return new ImageData(copyOfPixelData, source.width, source.height);
    }

    /**
     * Copies the pixel data from the source image into the pixels of the destination image. 
     * @param source An existing ImageData object that is the source for the pixel data.
     * @param dest An existing ImageData object that is the destination for the pixel data.
     */
    public static copyPixels(source: ImageData, dest: ImageData): void {
        for (let i = 0; i < source.data.length; i++) {
            dest.data[i] = source.data[i];
        }
    }

    public static convertToGrayscale(source: ImageData, dest: ImageData): void {
        //=========================================================================
        //Part 2.1 Convert to Grayscale
        //Iterate through the pixels in the source image data 
        //Calculate the grayscale value for each pixel
        //Set the corresponding pixel values (r,g,b,a) in the destination image data to the grayscale value
        //When this is complete, uncomment the corresponding line in RainingApp.ts  
        //Provide the appropriate parameters to that function to view the effect
        //=========================================================================

        for (let i = 0; i < source.data.length; i += 4) {

            var r = source.data[i];
            var g = source.data[i + 1];
            var b = source.data[i + 2];
            var grayscaleValue = (r + g + b) / 3;

            dest.data[i] = grayscaleValue;
            dest.data[i + 1] = grayscaleValue;
            dest.data[i + 2] = grayscaleValue;
            dest.data[i + 3] = source.data[i + 3];
        }
    }

    public static convertToGrayscaleInPlace(image: ImageData): void {
        return this.convertToGrayscale(image, image);
    }

    public static mirror(source: ImageData, dest: ImageData): void {
        //=========================================================================
        //Part 2.2 Mirror the Image
        //Iterate through the pixels in the source image data
        //Calculate the mirrored pixel location
        //Set the corresponding pixel values (r,g,b,a) in the destination image data to the mirrored value
        //When this is complete, uncomment the corresponding line in RainingApp.ts  
        //Provide the appropriate parameters to that function to view the effect
        //=========================================================================

        for (let y = 0; y < source.height; y++) {
            for (let x = 0; x < source.width; x++) {

                const srcIndex = (y * source.width + x) * 4;
                const destIndex = (y * source.width + (source.width - 1 - x)) * 4;

                dest.data[destIndex] = source.data[srcIndex];
                dest.data[destIndex + 1] = source.data[srcIndex + 1];
                dest.data[destIndex + 2] = source.data[srcIndex + 2];
                dest.data[destIndex + 3] = source.data[srcIndex + 3];
            }
        }
    }


    public static threshold(source: ImageData, dest: ImageData, threshold: number): void {
        //=========================================================================
        //Part 2.3 Threshold the Image
        //Iterate through the pixels in the source image data 
        //Check if the pixel's color channel value is greater than or equal to the threshold
        //Set the corresponding pixel values (r,g,b,a) in the destination image data to the appropriate value
        //based on the threshold result
        //When this is complete, uncomment the corresponding line in RainingApp.ts  
        //Provide the appropriate parameters to that function to view the effect
        //=========================================================================

        for (let i = 0; i < source.data.length; i += 4) {

            const grayscaleValue = source.data[i];

            if (grayscaleValue >= threshold * 255) {
                dest.data[i] = 255;
                dest.data[i + 1] = 255;
                dest.data[i + 2] = 255;
                dest.data[i + 3] = source.data[i + 3];
            } else {
                dest.data[i] = 0;
                dest.data[i + 1] = 0;
                dest.data[i + 2] = 0;
                dest.data[i + 3] = source.data[i + 3];
            }
        }
    }

    // --- Additional Helper Functions ---
    // You may find it useful to complete these to assist with some calculations of RainingApp.ts

    public static getRed(image: ImageData, col: number, row: number) {
        const index = (row * image.width + col) * 4;
        return image.data[index];
    }

    public static getGreen(image: ImageData, col: number, row: number) {
        const index = (row * image.width + col) * 4;
        return image.data[index + 1];
    }

    public static getBlue(image: ImageData, col: number, row: number) {
        const index = (row * image.width + col) * 4;
        return image.data[index + 2];
    }

    public static getAlpha(image: ImageData, col: number, row: number) {
        const index = (row * image.width + col) * 4;
        return image.data[index + 3];
    }
}

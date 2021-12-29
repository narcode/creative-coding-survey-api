import { loadJSON } from '../utils/ajax.js';
import { surveyData } from '../data/surveyData.js';

import * as P5 from "p5";

import '../css/creativecodingsurvey.scss';

export class CreativeCodingSurvey {
    constructor(element, options) {
        this.starField = [];
        this.iconSet = [];
    }

    preload(sketch) {
        this.iconSet['enthusiasts'] = sketch.loadImage('/img/enthusiasts.svg')
    }

    setup(sketch, surveyData) {
        this.sketch = sketch;
        this.surveyData = surveyData;

        // resize icons
        this.iconSet['enthusiasts'].resize(15,15)

        sketch.createCanvas(sketch.windowWidth, sketch.windowHeight)

        // we should plot data from the surveyData
        for(let i = 0; i < 80; i++){
            const randX = sketch.round(sketch.random(0, window.innerWidth));
            const randY = sketch.round(sketch.random(0, window.innerHeight));
            const randR = sketch.random(2, 4);

            // new makeStar(randX, randY, randR)
            this.starField.push({
                draw: () => {
                    // sketch.circle(randX, randY, randR)
                    // sketch.fill(255);
                    //
                    sketch.image(this.iconSet['enthusiasts'], randX, randY);
                }}
            );
        }
    }

    draw(sketch) {
        // console.log(this.surveyData)

        sketch.background(255);

        this.starField.map((starPoint) => {
            starPoint.draw()
        });
    }

    windowResized(sketch) {
        sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
    }
}

const projectCanvas = new CreativeCodingSurvey();
export default element => {
    console.log('Component mounted on', element);

    loadJSON('https://mapping-api.creativecodingutrecht.nl/creative-coders', (data) => {
        console.log('fresh live data', data)
    }, (error) => {
        console.log('stale local data', surveyData)
    });

    const thisSketch = ( sketch ) => {
        sketch.preload = () => projectCanvas.preload(sketch);
        sketch.setup = () => projectCanvas.setup(sketch, surveyData);
        sketch.draw = () => projectCanvas.draw(sketch);
        sketch.windowResized = () => projectCanvas.windowResized(sketch);
    };

    let myp5 = new P5(thisSketch);
};

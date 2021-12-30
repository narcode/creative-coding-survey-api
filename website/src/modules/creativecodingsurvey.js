import { loadJSON } from '../utils/ajax.js';
import { mockData } from '../data/surveyData.js';

import * as P5 from "p5";

import '../css/creativecodingsurvey.scss';

export class CreativeCodingSurvey {
    constructor(element, options) {
        this.canvasEntitites    = [];
        this.iconSet            = [];
    }

    preload(sketch) {
        this.iconSet['enthusiast'] = sketch.loadImage('/img/enthusiasts.svg')
        this.iconSet['maker'] = sketch.loadImage('/img/enthusiasts.svg')
        this.iconSet['organisation'] = sketch.loadImage('/img/enthusiasts.svg')
        this.iconSet['contributor'] = sketch.loadImage('/img/enthusiasts.svg')
        this.iconSet['venue'] = sketch.loadImage('/img/enthusiasts.svg')
        this.iconSet['event'] = sketch.loadImage('/img/enthusiasts.svg')
        this.iconSet['anonymous'] = sketch.loadImage('/img/enthusiasts.svg')
    }

    setup(sketch, surveyData) {
        this.sketch             = sketch;
        this.surveyData         = surveyData;

        // resize icons
        this.iconSet['enthusiast'].resize(15,15)

        sketch.createCanvas(sketch.windowWidth, sketch.windowHeight)

        this.surveyData.map((responseEntity) => {
            const randX = sketch.round(sketch.random(0, window.innerWidth));
            const randY = sketch.round(sketch.random(0, window.innerHeight));

            // new makeStar(randX, randY, randR)
            this.canvasEntitites.push({
                entity: responseEntity,
                draw: () => {
                    sketch.image(this.iconSet['enthusiast'], randX, randY);
                }}
            );
        });
        console.log(this.canvasEntitites);
    }

    draw(sketch) {
        sketch.background(255);

        this.canvasEntitites.map((canvasEntity) => {
            canvasEntity.draw()
        });
    }

    windowResized(sketch) {
        sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
    }
}

const projectCanvas = new CreativeCodingSurvey();
export default element => {
    console.log('Component mounted on', element);

    let apiURI = 'https://mapping-api.creativecodingutrecht.nl';
    let apiEndpoint = 'responses';
    let responseData;

    loadJSON(`${apiURI}/${apiEndpoint}`, (data) => {
        console.log('fresh live data', data);
        responseData = (!data.error) ? data.data : mockData;
    }, (error) => {
        console.log('stale local data', mockData);
        responseData = mockData;
    });

    const thisSketch = ( sketch ) => {
        sketch.preload = () => projectCanvas.preload(sketch);
        sketch.setup = () => projectCanvas.setup(sketch, responseData);
        sketch.draw = () => projectCanvas.draw(sketch);
        sketch.windowResized = () => projectCanvas.windowResized(sketch);
    };

    let myp5 = new P5(thisSketch);
};

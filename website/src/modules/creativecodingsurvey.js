import { loadJSON } from '../utils/ajax.js';
import { mockData } from '../data/surveyData.js';

import * as P5 from "p5";

import '../css/creativecodingsurvey.scss';

export class CreativeCodingSurvey {
    constructor(element, options) {
        this.canvasEntitites    = [];
        this.iconSet            = [];
        this.altSet            = [];
    }

    preload(sketch) {
        this.iconSet['enthusiast']      = sketch.loadImage('/img/enthusiast.svg')
        this.iconSet['maker']           = sketch.loadImage('/img/maker.svg')
        this.iconSet['organisation']    = sketch.loadImage('/img/venue.svg')
        this.iconSet['contributor']     = sketch.loadImage('/img/contributor.svg')
        this.iconSet['venue']           = sketch.loadImage('/img/venue.svg')
        this.iconSet['event']           = sketch.loadImage('/img/event.svg')
        this.iconSet['anonymous']       = sketch.loadImage('/img/anonymous.svg')

        this.altSet['enthusiast']      = '/img/enthusiast.svg'
        this.altSet['maker']           = '/img/maker.svg'
        this.altSet['organisation']    = '/img/venue.svg'
        this.altSet['contributor']     = '/img/contributor.svg'
        this.altSet['venue']           = '/img/venue.svg'
        this.altSet['event']           = '/img/event.svg'
        this.altSet['anonymous']       = '/img/anonymous.svg'
    }

    setup(sketch, surveyData) {
        this.sketch             = sketch;
        this.surveyData         = surveyData;
        this.typeCount          = {
            enthusiast: 0,
            maker: 0,
            organisation: 0,
            contributor: 0,
            venue: 0,
            event: 0,
            anonymous: 0,
        };

        this.resizeIcons();

        sketch.createCanvas(sketch.windowWidth, sketch.windowHeight)

        // create definitive set of results,
        this.surveyData.map((responseEntity) => {
            const randX         = sketch.round(sketch.random(0, window.innerWidth));
            const randY         = sketch.round(sketch.random(0, window.innerHeight));
            const entityType    = responseEntity.responses.type.length ? responseEntity.responses.type[0].toString().toLowerCase().trim() : 'anonymous';

            this.typeCount[entityType]++;

            let clickable = sketch.createDiv().position(randX, randY+100)
                .style("height", "20px").style("width", "20px")
                .style("background-image", "url(" + this.altSet[entityType] + ')').style("background-size", "contain")
                .mouseOver( function (){ showDetails(sketch, responseEntity, randX-10, randY+90) } )

            // add an initial entity position, randomly relative to the current viewport
            this.canvasEntitites.push({
                entity: responseEntity,
                coordinates: { x: randX, y: randY },
                state: 'inactive',
                draw: () => {
                    // sketch.image(this.iconSet[entityType], randX, randY);
                }}
            );
        });

        for (const [type, count] of Object.entries(this.typeCount)) {
            const typeContainer = document.querySelector( `.menu li.${type} a`);
            typeContainer.setAttribute('data-value', count);
        }
        const totalCountContainer = document.querySelector( `.menu li:first-of-type`);
        totalCountContainer.setAttribute('data-value', this.surveyData.length);

        function showDetails(sketch, e, x, y) {
            console.log(e.responses);
            let show = sketch.createDiv().position(x, y).id(e.id)
                .style("background", "white")
                .style("border", "2px solid red")
                .style("padding", "3px")
                .html("<div style='padding:10px; font-size:75%;' onmouseleave='(function(){ let a = document.getElementById(" + e.id + "); a.remove(); })()'>"
                    + "<div>" + replaceUndefined(e.responses.name) + "</div>"
                    + "<div>" + replaceUndefined(e.responses.website) + "</div>"
                    + "<div>" + replaceUndefined(e.responses.countryOfResidence) + "</div>"
                    + "<div style='color: red'>" + e.responses.disciplines.join(' ') + "</div>"
                    + "<div style='color: green'>" + e.responses.tools.join(' ') + "</div>"
                    + "</div>"
                    );
            }

        function replaceUndefined(s) {
            return s === undefined ? 'anonymous' : s
        }

    }


    draw(sketch) {
        sketch.background(255);

        this.canvasEntitites.map((canvasEntity) => {
            canvasEntity.draw()
        });
    }

    windowResized(sketch) {
        sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);

        /* todo: we should probably recalculate the entities positions here, relative to the new canvas dimensions */
    }

    // resize icons
    resizeIcons() {
        for (let icon in this.iconSet) {
            this.iconSet[icon].resize(20,20);
        }
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
        sketch.disableFirendlyErrors = true;
    };

    let myp5 = new P5(thisSketch);
};

import 'p5'
import * as P5 from "p5";

class CreativeCodingSurvey {

    constructor(element, options) {
        this._element = element;
        this._options = {...CreativeCodingSurvey.options, ...options};

        this.load();
    }

    static get options() {
        return {
            debugMode: false
        };
    }

    load() {
        this._svgNameSpace = 'http://www.w3.org/2000/svg';
        this._bindEvents();
    }

    _bindEvents() {
        window.addEventListener('resize', {});
        window.addEventListener('load', {});
    }


    setup(sketch) {
        this.sketch = sketch;
    }

    draw(sketch) {
        sketch.translate(0,0);
    }

    destroy() {
    }
}

export default element => {
    console.log('Component mounted on', element);

    const CreativeCodingSurvey = new CreativeCodingSurvey();
    const thisSketch = ( sketch ) => {
        sketch.setup = () => CreativeCodingSurvey.setup(sketch);
        sketch.draw = () => CreativeCodingSurvey.draw(sketch);
    };

    let myp5 = new P5(thisSketch);
}
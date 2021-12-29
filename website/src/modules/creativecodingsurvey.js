import { loadJSON } from '../utils/ajax.js';
import { surveyData } from '../data/surveyData.js';

import '../css/creativecodingsurvey.scss';

let useMockData = true;

export default element => {
    console.log('Component mounted on', element);

    // public component API
    element.loadAnswersJSON = () => {
        if (!useMockData) {
            let endpoint = 'https://mapping-api.creativecodingutrecht.nl/creative-coders';
            loadJSON(endpoint, (data) => {
                console.log(data)
            });
        }
        else {
            console.log(surveyData)
        }
    };
    element.loadAnswersJSON()

    // dispatch events to notify other components
    element.dispatchEvent(new CustomEvent('bar'));

    // expose destroy method
    return () => {
        // restore content
        element.textContent = '';

        // clean up methods
        element.foo = undefined;
    };
};
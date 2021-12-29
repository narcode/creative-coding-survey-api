import { loadJSON } from '../utils/ajax.js';
import { surveyData } from '../data/surveyData.js';

import '../css/creativecodingsurvey.scss';

export default element => {
    console.log('Component mounted on', element);

    loadJSON('https://mapping-api.creativecodingutrecht.nl/creative-coders', (data) => {
        console.log('fresh live data', data)
    }, (error) => {
        console.log('stale local data', surveyData)
    });
};
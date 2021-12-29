import '../css/creativecodingsurvey.scss';
import { loadJSON } from '../utils/ajax.js';

export default element => {
    console.log('Component mounted on', element);
        // this.loadAnswersJSON();

    // public component API
    element.loadAnswersJSON = () => {
        if (!window.mappingJSONData) {

            let endpoint = 'https://mapping-api.creativecodingutrecht.nl/answers';
            loadJSON(endpoint, (data) => {
                    console.log(data)
                },
                (error) => {
                    console.log(`error! ${error}`)
                }
            );
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
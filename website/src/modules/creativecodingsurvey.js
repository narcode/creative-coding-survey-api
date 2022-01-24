import { loadJSON } from '../utils/ajax.js';
import { mockData } from '../data/surveyData.js';

import '../css/creativecodingsurvey.scss';

export class CreativeCodingSurvey {
    constructor(element, responseData) {
        // start by exposing the survey data to the DOM and window instance
        // values of the window entries will update along with the state
        this.surveyData         = window.entities = responseData;
        this.domEntitites       = window.DOMEntities = [];

        this.allDisciplines     = [];
        this.typeCount          = {
            enthusiast: 0,
            maker: 0,
            organisation: 0,
            contributor: 0,
            venue: 0,
            event: 0,
            anonymous: 0,
        };

        let root = document.documentElement;
        let viewport = window.visualViewport;
        
        viewport.addEventListener("resize", () => {
            let fontScale = 100/viewport.scale
            let ents = Array.from(document.querySelectorAll('.entity-container'));
            ents.forEach(ent => {
                ent.style.setProperty('--fontScale', `${fontScale}%`);
            });
        });
        
        root.addEventListener("mousemove", e => {
            let boxShadow = {
                x: this.lerpCoordinates((window.innerWidth/2 - e.clientX), 0, -window.innerWidth, 0, 5),
                y: this.lerpCoordinates((window.innerHeight/2 - e.clientY), 0, -window.innerHeight, 0, 5)
            };

            root.style.setProperty('--boxShadowX', `${boxShadow.x}px`);
            root.style.setProperty('--boxShadowY', `${boxShadow.y}px`);
        });

        // listen fro changes checkboxes
        root.addEventListener("change", e => {
            if (e.target.checked) {
                console.log(`select all entities with class ${e.target.id}`)
                let allOfThese = document.querySelectorAll(`.${e.target.id}`);
console.log(allOfThese); // this is the result set of entities we want to animate to 'huddle' together
                allOfThese.forEach(entity => { entity.classList.add('selected') })
            }
            else {
                let allOfThese = document.querySelectorAll(`.${e.target.id}`);
                allOfThese.forEach(entity => { entity.classList.remove('selected') })
            }
        })

        let disciplinesFilter = document.createElement('div');
        disciplinesFilter.classList.add('filter','filter-disciplines');
        disciplinesFilter.id        = 'filter-disciplines';
        disciplinesFilter.innerText = '+';

        document.body.appendChild(disciplinesFilter);

        disciplinesFilter.addEventListener('mouseover', (event) => {
            if (!document.getElementById('disciplines-container')) {
                let disciplinesContainer = this.createDisciplinesFilter(30, 90);
                event.target.appendChild(disciplinesContainer);

                disciplinesContainer.addEventListener('click', (event) => {
                    const isLi = event.target.nodeName === 'LI';
                    if (!isLi) {
                        return;
                    }

                    console.log(event.target);
                    this.highlightEntities(event.target.innerText);
                })
            }
        });

        // this is where we're creating entities
        this.surveyData.map((responseEntity) => {
            DOMEntities.push(new DOMEntity(responseEntity, this));
        });

        // update all type totals in top nav
        this.updateTypeTotals();

        // set total number of entities in top nav
        const totalCountContainer = document.querySelector( `.menu li:first-of-type`);
        totalCountContainer.setAttribute('data-value', this.surveyData.length);
    }

    updateTypeTotals() {
        for (const [type, count] of Object.entries(this.typeCount)) {
            const typeContainer = document.querySelector( `.menu li.${type} a`);
            typeContainer.setAttribute('data-value', count);
        }
    }

    showEntityDetails(entity, x, y) {
        let entityDetails           = document.createElement('div');
            // entityDetails.id            = 'd_' + entity.id;
            entityDetails.className     = 'entity-details';
            entityDetails.innerHTML     = `
            <div>${this.replaceUndefined(entity.responses.name)}</div>
            <div>${this.replaceUndefined(entity.responses.website)}</div>
            <div>${this.replaceUndefined(entity.responses.countryOfResidence)}</div>
            <div class="entity-details__disciplines">${('disciplines' in entity.responses ? entity.responses.disciplines.join(' ') : '')}</div>
            <div class="entity-details__tools">${('tools' in entity.responses ? entity.responses.tools.join(' ') : '')}</div>`;

        return entityDetails;
    }

    createDisciplinesFilter(x, y) {
        let disciplinesContainer = document.createElement('ul');
            disciplinesContainer.classList.add('disciplines-container');
            disciplinesContainer.id         = 'disciplines-container';
            disciplinesContainer.style.left = `${x}px`; /** do we want get these coords from wihtin js? tho **/
            disciplinesContainer.style.top  = `${y}px`;

        this.allDisciplines.map((discipline, i) => {
            disciplinesContainer.insertAdjacentHTML('beforeend', `<li>${discipline}</li>`)
        });

        return disciplinesContainer;
    }

    highlightEntities(s) {
        let f = document.getElementById('filter-disciplines');
        f.innerText = "+ " + s;
        window.entities.map(i => {
            let entity = document.getElementById(i.id);
            entity.classList.toggle('entity-container--highlighted', (i.responses.disciplines.find(e => e === s) !== undefined));
        });
    }

    replaceUndefined(s) {
        return s === undefined ? 'anonymous' : s
    }

    lerpCoordinates(mousePosition, boundingMin, boundingMax, lerpMin, lerpMax) {
        return (mousePosition - boundingMin)/(boundingMax - boundingMin) * (lerpMax - lerpMin) + lerpMin;
    }

    windowResized() {
        /* todo: we should probably recalculate the entities positions here, relative to the new canvas dimensions */
    }
}

// this creates a unique DOM entity from a surveyData row
export class DOMEntity {
    constructor(responseEntity, instance) {
        // console.log(responseEntity);
        const randX         = Math.floor(Math.random() * window.innerWidth);
        const randY         = Math.floor(Math.random() * window.innerHeight);
        const entityType    = responseEntity.responses.type.length ? responseEntity.responses.type[0].toString().toLowerCase().trim() : 'anonymous';

        instance.typeCount[entityType]++;

        let clickableEntity         = document.createElement('div');
        clickableEntity.id          = responseEntity.id;
        clickableEntity.style.left  = `${randX}px`;
        clickableEntity.style.top   = `${randY + 100}px`;
        clickableEntity.setAttribute(`data-type`, entityType);

        // collect all unique disciplines in a designated array
        for (let entityDiscipline of responseEntity.responses.disciplines) {
            if (instance.allDisciplines.indexOf(entityDiscipline) === -1) {
                instance.allDisciplines.push(entityDiscipline)
            }
            // decorate icon with a recognisable className
            clickableEntity.classList.add(entityDiscipline.toLowerCase().replace(' ',''));
        }
        clickableEntity.classList.add( `entity-container`, `icon`, `icon-${entityType}`);

        document.body.appendChild(clickableEntity);

        // we're adding the entity details container once, on the first hover, after that css does the showing and the hiding
        clickableEntity.addEventListener('mouseover', (event) => {
            if (!clickableEntity.querySelector('.entity-details')) {
                event.target.appendChild(
                    instance.showEntityDetails(responseEntity, randX - 10, randY + 25)
                );
            }
        });

        return clickableEntity;
    }
}

// this is the default method executed when the project is loaded from the template initialisation
export default element => {
    console.log('Component mounted on', element);

    let apiURI = 'https://mapping-api.creativecodingutrecht.nl';
    let apiEndpoint = 'responses';
    let responseData;

    loadJSON(`${apiURI}/${apiEndpoint}`, (data) => {
        console.log('fresh live data', data);
        responseData = (!data.error) ? data.data : mockData;
        startInstance(responseData)
    }, (error) => {
        console.log('stale local data', mockData);
        responseData = mockData;
        startInstance(responseData);
    });

    const startInstance = (responseData) => {
        new CreativeCodingSurvey(element, responseData);
    }
};

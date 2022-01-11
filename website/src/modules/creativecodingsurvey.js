import { loadJSON } from '../utils/ajax.js';
import { mockData } from '../data/surveyData.js';

import '../css/creativecodingsurvey.scss';

export class CreativeCodingSurvey {
    constructor(element, responseData) {
        this.canvasEntitites    = [];
        this.allDisciplines     = [];
        this.altSet             = [];

        this.surveyData         = responseData;
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
        root.addEventListener("mousemove", e => {
            let boxShadow = {
                x: this.lerpCoordinates((window.innerWidth/2 - e.clientX), 0, -window.innerWidth, 0, 3),
                y: this.lerpCoordinates((window.innerHeight/2 - e.clientY), 0, -window.innerHeight, 0, 3)
            };

            root.style.setProperty('--boxShadowX', `${boxShadow.x}px`);
            root.style.setProperty('--boxShadowY', `${boxShadow.y}px`);
        });

        let disciplinesFilter = document.createElement('div');
        disciplinesFilter.classList.add('filers','filter-disciplines');
        disciplinesFilter.innerText = '+';
        disciplinesFilter.addEventListener('hover', () => this.showDisciplines(30, 90))
        document.body.appendChild(disciplinesFilter);

        this.surveyData.map((responseEntity) => {
            const randX         = Math.floor(Math.random() * window.innerWidth);
            const randY         = Math.floor(Math.random() * window.innerHeight);
            const entityType    = responseEntity.responses.type.length ? responseEntity.responses.type[0].toString().toLowerCase().trim() : 'anonymous';

            this.typeCount[entityType]++;

            let clickableEntity             = document.createElement('div');
            clickableEntity.id              = responseEntity.id;
            clickableEntity.style.left      = `${randX}px`;
            clickableEntity.style.top       = `${randY + 100}px`;

            for (let entityDiscipline of responseEntity.responses.disciplines) {
                // collect all unique disciplines in a designated array
                if (this.allDisciplines.indexOf(entityDiscipline) === -1) {
                    this.allDisciplines.push(entityDiscipline)
                }
                // decorate icon with a recognisable className
                clickableEntity.classList.add(entityDiscipline.toLowerCase().replace(' ',''));
            }
            clickableEntity.classList.add( `entity-container`, `icon`, `icon-${entityType}`);

            document.body.appendChild(clickableEntity);

            clickableEntity.addEventListener('mouseover', (event) => {
                if (!document.getElementById('d_' + responseEntity.id)) {
                    event.target.appendChild(
                        this.showDetails(responseEntity, randX - 10, randY + 25)
                    );
                }
            });

            // add an initial entity position, randomly relative to the current viewport
            this.canvasEntitites.push({
                entity: responseEntity,
                coordinates: { x: randX, y: randY },
                state: 'inactive',
                draw: () => {}
            });
        });

        for (const [type, count] of Object.entries(this.typeCount)) {
            const typeContainer = document.querySelector( `.menu li.${type} a`);
            typeContainer.setAttribute('data-value', count);
        }
        const totalCountContainer = document.querySelector( `.menu li:first-of-type`);
        totalCountContainer.setAttribute('data-value', this.surveyData.length);
    }

    showDetails(entity, x, y) {
        console.log(entity.responses);

        let entityDetails           = document.createElement('div');
        entityDetails.id            = 'd_' + entity.id;
        entityDetails.className     = 'entity-details';
        entityDetails.innerHTML     = `
<!--                <div style='padding:10px; font-size:75%;' onmouseleave='(function(){ let a = document.getElementById(\"" + elemId + "\"); a.remove(); })()'>"-->
            <div>${this.replaceUndefined(entity.responses.name)}</div>
            <div>${this.replaceUndefined(entity.responses.website)}</div>
            <div>${this.replaceUndefined(entity.responses.countryOfResidence)}</div>
            <div style='color: red'>${('disciplines' in entity.responses ? entity.responses.disciplines.join(' ') : '')}</div>
            <div style='color: green'>${('tools' in entity.responses ? entity.responses.tools.join(' ') : '')}</div>
<!--            </div>-->
`;
        return entityDetails;
    }

    showDisciplines(x, y) {
        let disciplinesContainer = document.createElement('ul');
        disciplinesContainer.classList.add('disciplines-container');
        disciplinesContainer.style.left = `${x}px`;
        disciplinesContainer.style.top  = `${y}px`;

        let show = sketch.createDiv().position(x, y).id('disciplines')
            .html("<div style='padding:10px; font-size:75%;' onmouseleave='(function(){ let a = document.getElementById(\"disciplines\"); a.remove(); })()'>"
                + "<div class='category' onclick='highlightEntities(\"Design\")'>Design</div>"
                + "<div class='category' onclick='highlightEntities(\"Art\")'>Art</div>"
                + "<div class='category' onclick='highlightEntities(\"Education\")'> Education</div>"
                + "<div class='category' onclick='highlightEntities(\"Music\")'>Music</div>"
                + "<div class='category' onclick='highlightEntities(\"Performance\")'>Performance</div>"
                + "<div class='category' onclick='highlightEntities(\"Science\")'>Science</div>"
                + "<div class='category' onclick='highlightEntities(\"Digital Culture\")'>Digital Culture</div>"
                + "<div class='category' onclick='highlightEntities(\"Live Coding\")'>Live Coding</div>"
                + "</div>"
            );
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

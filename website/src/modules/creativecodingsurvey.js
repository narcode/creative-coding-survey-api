import { loadJSON } from '../utils/ajax.js';
import { mockData } from '../data/surveyData.js';

import '../css/creativecodingsurvey.scss';

function randomAngle() {
    return Math.random() * Math.PI * 2;
}

function randomInRange(low, high) {
    return Math.random() * (high - low) + low;
}

function elipseRadiusAtAngle(angle, xRadius, yRadius) {
    return (yRadius * xRadius) / Math.sqrt(yRadius ** 2 * Math.sin(angle) ** 2 + xRadius ** 2 * Math.cos(angle) ** 2);
}

function elipseAngleAtPoint(center, point) {
    return Math.atan2(point.x - center.x, point.y - center.y);
}

function polarToCartesian(angle, radius, offset) {
    return {
      x: radius * Math.sin(angle) + offset.x,
      y: radius * Math.cos(angle) + offset.y,
    };
}

function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

const extraRadius = 30;
const clearanceRadius = 40;

function computeMovePositionInOrbit(center, xRadius, yRadius) {
    const angle = randomAngle();
    const extraDist = randomInRange(clearanceRadius, extraRadius);
    const angleRadius = elipseRadiusAtAngle(angle, xRadius, yRadius);
    return polarToCartesian(angle, angleRadius + extraDist, center);
}

function computeMovePositionOutOfOrbit(center, xRadius, yRadius, current) {
    const angle = elipseAngleAtPoint(center, current);
    const angleRadius = elipseRadiusAtAngle(angle, xRadius, yRadius);
    const totalRadius = angleRadius + extraRadius + clearanceRadius;
    const dist = distance(center, current);
    if (totalRadius >= dist) {
        const extraDist = (totalRadius - dist) * 1.5;
        return polarToCartesian(angle, totalRadius + extraDist, center);
    } else {
        return null;
    }
}

function computeMovePosition(center, xRadius, yRadius, selected, current) {
    if (selected) {
        return computeMovePositionInOrbit(center, xRadius, yRadius);
    } else {
        return computeMovePositionOutOfOrbit(center, xRadius, yRadius, current);
    }
}

export class CreativeCodingSurvey {
    constructor(element, responseData) {
        // start by exposing the survey data to the DOM and window instance
        // values of the window entries will update along with the state
        this.surveyData         = window.entities = responseData;
        const domEntities = this.domEntitites       = window.DOMEntities = [];

        this.allDisciplines     = [];
        this.allKeywords        = [];
        this.allTools           = [];
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

        // for scaling the font and layout when zoomin in and out (pinching getsure on trackpad/mobile)
        viewport.addEventListener("resize", () => {
            let marginScale = 0.5/viewport.scale
            let fontScale = 100/viewport.scale
            let ents = Array.from(document.querySelectorAll('.entity-container'));
            let textdivs = Array.from(document.querySelectorAll('.entity-container .entity-details > div:not(:last-of-type)'));
            ents.forEach(ent => {
                ent.style.setProperty('--fontScale', `${fontScale}%`);
            });
            textdivs.forEach(tdiv => {
                tdiv.style.setProperty('--marginScale', `${marginScale}em`);
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

        // listen for changes checkboxes
        root.addEventListener("change", e => {
            const label = e.target.labels[0];
            const xRadius = label.offsetWidth / 2;
            const yRadius = label.offsetHeight / 2;
            const center = {x: label.offsetLeft + xRadius, y: label.offsetTop + yRadius};
            if (e.target.checked) {
                domEntities.forEach((entity) => entity.moveForSelectedDiscipline(e.target.id, center, xRadius, yRadius));
            }
            else {
                domEntities.forEach((entity) => entity.resetPosition(e.target.id));
            }
        })

        let keywordsFilter = document.createElement('div');
        keywordsFilter.classList.add('filter','filter-keywords');
        keywordsFilter.id        = 'filter-keywords';
        keywordsFilter.innerHTML = '<div id="kfilter">+</div>';

        document.body.appendChild(keywordsFilter);

        keywordsFilter.addEventListener('mouseover', (event) => {
            if (!document.getElementById('keywords-container')) {
                let keywordsContainer = this.createKeywordsFilter();
                event.target.appendChild(keywordsContainer);

                keywordsContainer.addEventListener('click', (event) => {
                    const isSpan = event.target.nodeName === 'SPAN';
                    console.log(event.target.nodeName);
                    if (!isSpan) {
                        return;
                    }

                    this.highlightEntities(event.target.innerText);
                })
            }
        });

        // remove filters
        let filterelem = document.getElementById('kfilter');
        filterelem.addEventListener('click', (event) => {
            this.unhighlightEntities(event.target.innerText);
            event.target.innerText = "+"
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
            const typeContainer = document.querySelector( `.menu li.${type} p`);
            typeContainer.setAttribute('data-value', count);
        }
    }

    showEntityDetails(entity, x, y) {
        let entityDetails           = document.createElement('div');
            // entityDetails.id            = 'd_' + entity.id;
            entityDetails.className     = 'entity-details';
            entityDetails.innerHTML     = `
            <div class='details'>${this.replaceUndefined(entity.responses.name)}</div>
            <div class='details'>${this.replaceUndefined(entity.responses.website)}</div>
            <div class='details'>${this.replaceUndefined(entity.responses.countryOfResidence)}</div>
            <div class="entity-details__disciplines details">${('disciplines' in entity.responses ? entity.responses.disciplines.join(' ') : '')}</div>
            <div class="entity-details__tools details">${('tools' in entity.responses ? entity.responses.tools.join(' ') : '')}</div>`;

        return entityDetails;
    }

    createKeywordsFilter() {
        let keywordsContainer = document.createElement('div');
            keywordsContainer.classList.add('filter-container');
            keywordsContainer.id         = 'keywords-container';

        this.allKeywords.map((keyword, i) => {
            keywordsContainer.insertAdjacentHTML('beforeend', `<span>${keyword}</span>`)
        });

        return keywordsContainer;
    }

    highlightEntities(s) {
        let f = document.getElementById('kfilter');
        f.innerText = `- ${s}`;
        window.entities.map(i => {
            let entity = document.getElementById(i.id);
            entity.classList.toggle('entity-container--highlighted', (i.responses.keywords.find(e => e === s) !== undefined));
        });
    }

    unhighlightEntities(s) {
        let f = document.getElementById('kfilter');
        f.innerText = "+";
        window.entities.map(i => {
            let entity = document.getElementById(i.id);
            entity.classList.toggle('entity-container--highlighted', (i.responses.keywords.find(e => e === s) !== undefined));
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
        const top = randY + 100;
        const entityType    = responseEntity.responses.type.length ? responseEntity.responses.type[0].toString().toLowerCase().trim() : 'anonymous';

        instance.typeCount[entityType]++;

        let clickableEntity         = document.createElement('div');
        clickableEntity.id          = responseEntity.id;

        // Make the starting point of the jitter animation random
        clickableEntity.style.animationDelay = `${Math.random() * -100}s`;

        clickableEntity.style.left  = `${randX - 10}px`;
        clickableEntity.style.top   = `${top - 10}px`;
        clickableEntity.style.transition = "all 0.5s ease-in";
        clickableEntity.setAttribute(`data-type`, entityType);

        // collecting keywords for block filter highlighter
        for (let keyword of responseEntity.responses.keywords) {
            if (instance.allKeywords.indexOf(keyword) === -1) {
                instance.allKeywords.push(keyword);
            }
        }

        // and tools
        // for (let tool of responseEntity.responses.tools) {
        //     if (instance.allTools.indexOf(tool) === -1) {
        //         instance.allTools.push(tool);
        //     }
        // }

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
                let details = instance.showEntityDetails(responseEntity, randX - 10, randY + 25);
                details.style.setProperty('--marginScale', `.5em`); // initialize values.
                event.target.appendChild(details);
            }
        });

        this.responseEntity = responseEntity;
        this.clickableEntity = clickableEntity;
        this.taggedOriginalPosition = {tag: "origin", point: {x: randX, y: top}};
        this.positionStack = [this.taggedOriginalPosition];
    }

    unselectedMoveTo(tag, point) {
        this.positionStack[0] = {tag, point};
        this.moveToPosition();
    }

    selectedMoveTo(tag, point) {
        if (this.positionStack.length === 1) {
            this.clickableEntity.classList.add('selected');
        }
        this.positionStack.push({tag, point});
        this.moveToPosition();
    }

    moveForSelectedDiscipline(discipline, center, xRadius, yRadius) {
        if (this.hasClass(discipline)) {
            this.selectedMoveTo(discipline, computeMovePositionInOrbit(center, xRadius, yRadius));
        } else {
            const point = computeMovePositionOutOfOrbit(center, xRadius, yRadius, this.originalPosition());
            if (point != null) {
                this.unselectedMoveTo(discipline, point);
            }
        }
    }

    moveToPosition() {
        const {x, y} = this.position();
        this.clickableEntity.style.left = `${x - 10}px`;
        this.clickableEntity.style.top = `${y - 10}px`;
    }

    originalPosition() {
        return this.taggedOriginalPosition.point;
    }

    position() {
        return this.positionStack[this.positionStack.length - 1].point;
    }

    resetPosition(tagToReset) {
        const index = this.positionStack.findIndex(({tag}) => tag === tagToReset);
        if (index === 0) {
            this.positionStack[0] = this.taggedOriginalPosition;
            this.moveToPosition();
        } else if (index !== -1) {
            this.positionStack.splice(index, 1);
            if (index === this.positionStack.length) {
                this.moveToPosition();
            }
            if (this.positionStack.length === 1) {
                this.clickableEntity.classList.remove('selected');
            }
        }
    }

    hasClass(class_) {
        return this.clickableEntity.classList.contains(class_);
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

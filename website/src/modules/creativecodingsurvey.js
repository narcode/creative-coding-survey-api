import { loadJSON } from '../utils/ajax.js';
import { mockData } from '../data/surveyData.js';

import '../css/creativecodingsurvey.scss';
import cceLogo from '../logos/cce.png'
import sciLogo from '../logos/sci.gif'

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
        this.allFilters        = { "keywords": [], "tools": [] };
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

        // 2 filters.
        for (const t in this.allFilters) {
            let divFilter = document.createElement('div');
            divFilter.classList.add('filter');
            divFilter.id        = `filter-${t}`;
            divFilter.innerHTML = `<div id='${t}filter'>+</div>`;

            document.body.appendChild(divFilter);
            
            divFilter.addEventListener('mouseover', (event) => {
                if (!document.getElementById(`${t}-container`)) {
                    let optionsContainer = this.createFilterContainer(t);
                    event.target.appendChild(optionsContainer);
    
                    optionsContainer.addEventListener('click', (event) => {
                        const isSpan = event.target.nodeName === 'SPAN';
                        if (!isSpan) {
                            return;
                        }
    
                        this.highlightEntities(t, event.target.innerText);
                    })
                }
            }); 

           //remove filters 
            let filterelem = document.getElementById(`${t}filter`);
            filterelem.addEventListener('click', (event) => {
                this.unhighlightEntities(t, event.target.innerText);
                event.target.innerText = "+"
            });

        }
        
        this.makeColophon();

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

    makeColophon() {
        const randX         = Math.floor(Math.random() * window.innerWidth);
        const randY         = Math.floor(Math.random() * window.innerHeight);
        const top = randY + 100;

        let colophonEntity                  = document.createElement('div');
        colophonEntity.style.animationDelay = `${Math.random() * -100}s`;
        colophonEntity.style.transition     = "all 0.5s ease-in";
        colophonEntity.style.left           = `${randX - 10}px`;
        colophonEntity.style.top            = `${top - 10}px`;
        colophonEntity.style.height         = `25px`;
        colophonEntity.style.width          = `25px`;
        colophonEntity.style.backgroundSize = `25px`;

        colophonEntity.innerHTML = `<div class='colophon-details'>
            This project is a work in process of mapping the creative coding community around the world.
            We are offering a way to explore and investigate, and also add yourself as an entity by answering the following survey:
            <a href='https://mapping.creativecodingutrecht.nl/' target='_blank'>https://mapping.creativecodingutrecht.nl/</a>
            </br></br>
            This is a collaboration between Creative Coding Utrecht and 
            designer-researcher Avital Barkai, made possible by Creative Industries Fund NL and part of On-the-Fly, 
            a project co-funded by the Creative Europe program of the European Union.
            </br></br>
            Development, backend and frontend by Felipe Ignacio Noriega, Raphael Sousa Santos and Sietse van der Meer.
            </br></br>
            <div style='display: flex; align-items: center; justify-content:'>
            <div><img width="100%" src=${cceLogo}></img></div>
            <div style='width: 67%; padding-left: 30px'> <img width="50%" src=${sciLogo}></img></div>
            </div>
            </div>`;

        colophonEntity.classList.add(`entity-container`,`colophon`, `icon`, `icon-colophon`);
        document.body.appendChild(colophonEntity);
    }

    showEntityDetails(entity, x, y) {
        let entityDetails           = document.createElement('div');
            // entityDetails.id            = 'd_' + entity.id;
            entityDetails.className     = 'entity-details';
            entityDetails.innerHTML     = `
            <div class='details'>${this.replaceUndefined(entity.responses.name)}</div>
            <div class='details'>${this.makeWebsiteLink(entity.responses.website, true)}</div>
            <div class='details'>${this.replaceUndefined(entity.responses.countryOfResidence)}</div>
            <div class="entity-details__disciplines details">${('disciplines' in entity.responses ? entity.responses.disciplines.join(' ') : '')}</div>
            <div class="entity-details__tools details">${('tools' in entity.responses ? entity.responses.tools.join(' ') : '')}</div>`;

        return entityDetails;
    }

    createFilterContainer(filtertype) {
        let filterContainer = document.createElement('div');
            filterContainer.classList.add('filter-container');
            filterContainer.id         = `${filtertype}-container`;
        this.allFilters[filtertype].map((f, i) => {
            filterContainer.insertAdjacentHTML('beforeend', `<span>${f}</span>`)
        });

        return filterContainer;
    }

    highlightEntities(filterype, s) {
        let f = document.getElementById(`${filterype}filter`);
        f.innerText = `- ${s}`;
        let k = document.getElementById(`keywordsfilter`);
        let t = document.getElementById(`toolsfilter`);
        let getK = k.innerText.replace('- ', '');
        let getT = t.innerText.replace('- ', '');
        console.log(getK, getT);
        let keyword = getK;
        let tool = getT;

        window.entities.map(i => {
            let entity = document.getElementById(i.id);
            let shadowColorK = 'transparent';
            let shadowColorT = 'transparent';
            
            // keywords
            let entityMatchesK = (i.responses.keywords.find(e => e === keyword) !== undefined)
            if (entityMatchesK) {
                shadowColorK = '#ff0000c7';
            } 
            // tools
            let entityMatchesT = (i.responses.tools.find(e => e === tool) !== undefined)
            if (entityMatchesT) {
                shadowColorT = '#2af366be'
            }
             
            if (entityMatchesT || entityMatchesK) {
                entity.classList.add('entity-container--highlighted');              
            } else {
                entity.classList.remove('entity-container--highlighted');
            }

            entity.style.setProperty('--highlightedT', `${shadowColorT}`);
            entity.style.setProperty('--highlightedK', `${shadowColorK}`);
        });
    }

    unhighlightEntities(filterype, s) {
        let f = document.getElementById(`${filterype}filter`);
        f.innerText = "+";
        window.entities.map(i => {
            let entity = document.getElementById(i.id);
            switch (filterype) {
                case 'keywords':
                    entity.classList.toggle('entity-container--highlighted', (i.responses.keywords.find(e => e === s) !== undefined));
                    break;
                case  'tools':
                    entity.classList.toggle('entity-container--highlightedT', (i.responses.tools.find(e => e === s) !== undefined));
                default:
                    break;
            }
            
        });
    }

    replaceUndefined(s) {
        return s === undefined ? 'anonymous' : s
    }

    makeWebsiteLink(s) {
        if (s === undefined) {
            return 'anonymous';
        } else {
            if (s.includes('http')) {
                return "<a target='_blank' href='"+s+"'>"+s+"</a>";
            } else {
                return "<a target='_blank' href='https://"+s+"'>"+s+"</a>";
            }
        }  
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
        const entityType    = responseEntity.responses.type && responseEntity.responses.type.length ? responseEntity.responses.type[0].toString().toLowerCase().trim() : 'anonymous';
        
        // some responses dont have tools so add the propoerty
        if (!responseEntity.responses.hasOwnProperty('tools')) {
            responseEntity.responses.tools = []
        }

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
            if (instance.allFilters['keywords'].indexOf(keyword) === -1) {
                instance.allFilters['keywords'].push(keyword);
            }
        }

        for (let tool of responseEntity.responses.tools) {
            if (instance.allFilters['tools'].indexOf(tool) === -1) {
                instance.allFilters['tools'].push(tool);
            }
        }
        
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

import { loadJSON } from '../utils/ajax.js';
import { mockData } from '../data/surveyData.js';

import '../css/creativecodingsurvey.scss';
import cceLogo from '../logos/cce.png'
import sciLogo from '../logos/sci.gif'

function replaceUndefined(s) {
    return s === undefined ? 'anonymous' : s
}

function makeWebsiteLink(s) {
    if (s === undefined) {
        return 'anonymous';
    } else {
        if (s.includes('http')) {
            return "<a target='_blank' href='" + s + "'>" + s + "</a>";
        } else {
            return "<a target='_blank' href='https://" + s + "'>" + s + "</a>";
        }
    }
}

function randomInt(max) {
    return Math.floor(Math.random() * max);
}

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

const extraRadius = 130;
const clearanceRadius = 30;

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
        const extraDist = (totalRadius - dist) * (Math.random(5) + 1.5);
        return polarToCartesian(angle, totalRadius + extraDist, center);
    } else {
        return null;
    }
}

export class CreativeCodingSurvey {
    constructor(element, responseData) {
        // start by exposing the survey data to the DOM and window instance
        // values of the window entries will update along with the state
        this.surveyData = window.entities = responseData;

        this.allDisciplines = [];
        this.allFilters = { countryOfResidence: [], tools: [], keywords: [] };
        this.links = {
            contribute: {
                url: "https://mapping.creativecodingutrecht.nl",
                caption: "Contribute",
                target: "_blank",
                symbol: "⤴︎",

            },
            feedback: {
                url: `mailto:info@creativecodingutrecht.nl?subject=${encodeURIComponent("Creative Coding Ecologies | Feedback")}`,
                caption: "Feedback",
                symbol: "✓",
            }
        }
        this.typeCount = {
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
            let marginScale = 0.5 / viewport.scale
            let fontScale = 100 / viewport.scale
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
                x: this.lerpCoordinates((window.innerWidth / 2 - e.clientX), 0, -window.innerWidth, 0, 5),
                y: this.lerpCoordinates((window.innerHeight / 2 - e.clientY), 0, -window.innerHeight, 0, 5)
            };

            root.style.setProperty('--boxShadowX', `${boxShadow.x}px`);
            root.style.setProperty('--boxShadowY', `${boxShadow.y}px`);
        });

        // listen for changes checkboxes
        root.addEventListener("change", e => {
            this.mainGrid.moveEntitiesForDiscipline(e.target);
        })

        this.makeFilters();

        this.makeLinks();

        this.makeColophon();

        const topOffset = 100;
        const cellSize = 30;
        this.mainGrid = new Grid(
            0,
            topOffset,
            window.innerWidth,
            window.innerHeight - topOffset,
            cellSize,
        );

        // this is where we're creating the dom entities
        this.surveyData.map((responseEntity) => {
            this.processResponseEntity(responseEntity);
        });

        // update all type totals in top nav
        this.updateTypeTotals();

        // set total number of entities in top nav
        const totalCountContainer = document.querySelector(`.menu li:first-of-type`);
        totalCountContainer.setAttribute('data-value', this.surveyData.length);
    }

    makeLinks() {
        for (const link in this.links) {
            const caption = this.links[link].caption;
            const symbol = this.links[link].symbol;

            let divLink = document.createElement('div');
            divLink.classList.add('link');
            divLink.id = `link-${link}`;
            divLink.innerHTML = `<div id='${link}-link' data-attr="${caption}">${symbol}</div>`;

            document.body.appendChild(divLink);

            let e = document.getElementById(`${link}-link`);
            e.addEventListener('click', (event) => {
                const props = this.links[link];
                const url = props.url;
                const target = props.target;

                console.log("Clicked on link: ", url)
                window.open(url, target);
            });
        }
    }

    processResponseEntity(responseEntity) {
        const entityType = responseEntity.responses.type && responseEntity.responses.type.length ? responseEntity.responses.type[0].toString().toLowerCase().trim() : 'anonymous';

        responseEntity.entityType = entityType;

        // TODO: MOVE TO BACKEND
        // some responses dont have tools so add the propoerty
        if (!responseEntity.responses.hasOwnProperty('tools')) {
            responseEntity.responses.tools = []
        }

        this.typeCount[entityType]++;
        // collecting keywords for block filter highlighter
        for (let keyword of responseEntity.responses.keywords) {
            if (this.allFilters['keywords'].indexOf(keyword) === -1) {
                this.allFilters['keywords'].push(keyword);
            }
        }

        for (let tool of responseEntity.responses.tools) {
            if (this.allFilters['tools'].indexOf(tool) === -1) {
                this.allFilters['tools'].push(tool);
            }
        }

        const country = responseEntity.responses.countryOfResidence;
        if (this.allFilters['countryOfResidence'].indexOf(country) === -1) {
            this.allFilters['countryOfResidence'].push(country);
        }

        // collect all unique disciplines in a designated array
        for (let entityDiscipline of responseEntity.responses.disciplines) {
            if (this.allDisciplines.indexOf(entityDiscipline) === -1) {
                this.allDisciplines.push(entityDiscipline)
            }
        }

        this.mainGrid.addEntity(responseEntity);
    }

    updateTypeTotals() {
        for (const [type, count] of Object.entries(this.typeCount)) {
            const typeContainer = document.querySelector(`.menu li.${type} p`);
            typeContainer.setAttribute('data-value', count);
        }
    }

    makeColophon() {
        const randX = Math.floor(Math.random() * window.innerWidth);
        const randY = Math.floor(Math.random() * window.innerHeight);
        const top = randY + 100;

        let colophonEntity = document.createElement('div');
        colophonEntity.style.animationDelay = `${Math.random() * -100}s`;
        colophonEntity.style.transition = "all 0.5s ease-in";
        colophonEntity.style.left = `${randX - 10}px`;
        colophonEntity.style.top = `${top - 10}px`;
        colophonEntity.style.height = `25px`;
        colophonEntity.style.width = `25px`;
        colophonEntity.style.backgroundSize = `25px`;

        colophonEntity.innerHTML = `<div class='colophon-details'>
            This project is a work in process of mapping the creative coding community around the world.
            We are offering a way to explore and investigate, and also add yourself as an entity by answering the following survey:
            <a href='https://mapping.creativecodingutrecht.nl/' target='_blank'>https://mapping.creativecodingutrecht.nl/</a>
            </br></br>
            This is a collaboration between Creative Coding Utrecht and
            designer-researchers Avital Barkai and Camilo Garcia, made possible by Creative Industries Fund NL and part of On-the-Fly,
            a project co-funded by the Creative Europe program of the European Union.
            </br></br>
            Development, backend and frontend by Felipe Ignacio Noriega, Niels Janssen, Raphael Sousa Santos, and Sietse van der Meer.
            </br></br>
            <div style='display: flex; align-items: center; justify-content:'>
            <div><img width="100%" src=${cceLogo}></img></div>
            <div style='width: 67%; padding-left: 30px'> <img width="50%" src=${sciLogo}></img></div>
            </div>
            </div>`;

        colophonEntity.classList.add(`entity-container`, `colophon`, `icon`, `icon-colophon`);
        document.body.appendChild(colophonEntity);
    }

    makeFilters() {
        // 3 filters.
        for (const t in this.allFilters) {
            let divFilter = document.createElement('div');
            divFilter.classList.add('filter');
            divFilter.id = `filter-${t}`;
            divFilter.innerHTML = `<div id='${t}-filter-symbol'></div><div id='${t}-filter'></div>`;
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

                        this.addFilter(t, event.target.innerText);
                    })
                }
            });

            // Remove filter when clicking on symbol
            let symbolelem = document.getElementById(`${t}-filter-symbol`);
            symbolelem.addEventListener('click', () => {
                this.clearFilter(t);
            });

            // Remove filter when clicking on filter search term
            let filterelem = document.getElementById(`${t}-filter`);
            filterelem.addEventListener('click', () => {
                this.clearFilter(t);
            });
        }        
    }

    createFilterContainer(filtertype) {
        let filterContainer = document.createElement('div');
        filterContainer.classList.add('filter-container');
        filterContainer.id = `${filtertype}-container`;
        this.allFilters[filtertype].map((f, i) => {
            filterContainer.insertAdjacentHTML('beforeend', `<span>${f}</span>`)
        });

        return filterContainer;
    }

    decorateEntities() {
        let k = document.getElementById(`keywords-filter`);
        let t = document.getElementById(`tools-filter`);
        let c = document.getElementById(`countryOfResidence-filter`);
        let keyword = k.innerText;
        let tool = t.innerText;
        let country = c.innerText;
        // console.log(keyword, tool, country);

        window.entities.map(i => {
            let entity = document.getElementById(i.id);
            let shadowColorK = 'transparent';
            let shadowColorT = 'transparent';
            let shadowColorC = 'transparent';

            // keywords            
            let entityMatchesK = (keyword !== "" && (i.responses.keywords.find(e => e === keyword) !== undefined))
            if (entityMatchesK) {
                shadowColorK = '#ff0000c7';
            }

            // tools
            let entityMatchesT = (tool !== "" && (i.responses.tools.find(e => e === tool) !== undefined))
            if (entityMatchesT) {
                shadowColorT = '#2af366be'
            }

            // countryOfResidence
            let entityMatchesC = (country !== "" && (i.responses.countryOfResidence === country))
            if (entityMatchesC) {
                shadowColorC = 'gold'
            }

            if (entityMatchesT || entityMatchesK || entityMatchesC) {
                entity.classList.add('entity-container--highlighted');
            } else {
                entity.classList.remove('entity-container--highlighted');
            }

            entity.style.setProperty('--highlighted-tools', `${shadowColorT}`);
            entity.style.setProperty('--highlighted-keywords', `${shadowColorK}`);
            entity.style.setProperty('--highlighted-countryOfResidence', `${shadowColorC}`);
        });
    }

    addFilter(filtertype, s) {
        let symbol = document.getElementById(`${filtertype}-filter-symbol`);
        symbol.classList.add('filter-active');

        let search = document.getElementById(`${filtertype}-filter`);
        search.innerText = `${s}`;
        this.decorateEntities();
    }

    clearFilter(filtertype) {
        let symbol = document.getElementById(`${filtertype}-filter-symbol`);
        symbol.classList.remove('filter-active');

        let search = document.getElementById(`${filtertype}-filter`);
        search.innerText = ``;
        this.decorateEntities();
    }

    lerpCoordinates(mousePosition, boundingMin, boundingMax, lerpMin, lerpMax) {
        return (mousePosition - boundingMin) / (boundingMax - boundingMin) * (lerpMax - lerpMin) + lerpMin;
    }

    windowResized() {
        /* todo: we should probably recalculate the entities positions here, relative to the new canvas dimensions */
    }
}

class Grid {
    constructor(leftOffset, topOffset, width, height, cellSize) {
        this.leftOffset = leftOffset;
        this.topOffset = topOffset;
        this.width = width;
        this.height = height;
        this.microCellRatio = 3;
        this.microCellSize = cellSize / this.microCellRatio;
        this.initialCellSize = cellSize;
        this.occupied = {};
        this.domEntities = []
    }

    addEntity(responseEntity) {
        let cell = this.randomCell();
        let domEntity = new DOMEntity(responseEntity, this.translateFromCell(cell));
        this.addEntityToOccupied(cell, domEntity);
        this.domEntities.push(domEntity);
    }

    randomCell() {
        let y = randomInt(this.height / this.initialCellSize) * this.microCellRatio;
        let x = randomInt(this.width / this.initialCellSize) * this.microCellRatio;
        while (this.isOccupied(x, y)) {
            y = randomInt(this.height / this.microCellSize);
            x = randomInt(this.width / this.microCellSize);
        }
        return {x, y};
    }

    isOccupied(x, y) {
        return x in this.occupied && y in this.occupied[x];
    }

    translateFromCell({x, y}) {
        return {
            x: this.leftOffset + x * this.microCellSize,
            y: this.topOffset + y * this.microCellSize,
        };
    }

    translateToCell({x, y}, cellSize) {
        return {
            x: Math.floor((x - this.leftOffset) / cellSize) * (cellSize / this.microCellSize),
            y: Math.floor((y - this.topOffset) / cellSize) * (cellSize / this.microCellSize),
        };
    }

    moveEntitiesForDiscipline(disciplineCheckbox) {
        const id = disciplineCheckbox.id;
        if (disciplineCheckbox.checked) {
            const label = disciplineCheckbox.labels[0];
            const xRadius = label.offsetWidth / 2;
            const yRadius = label.offsetHeight / 2;
            const center = { x: label.offsetLeft + xRadius, y: label.offsetTop + yRadius };
            this.domEntities.forEach((entity) => this.moveEntityForSelectedDiscipline(entity, id, center, xRadius, yRadius));
        } else {
            this.domEntities.forEach((entity) => this.moveEntityForUnselectedDiscipline(entity, id));
        }
    }

    randomCellInOrbit(center, xRadius, yRadius) {
        let point = computeMovePositionInOrbit(center, xRadius, yRadius);
        let cell = this.translateToCell(point, this.initialCellSize);
        while (this.isOccupied(cell.x, cell.y)) {
            point = computeMovePositionInOrbit(center, xRadius, yRadius);
            cell  = this.translateToCell(point, this.microCellSize);
        }
        return cell;
    }

    randomCellOutOfOrbit(center, xRadius, yRadius, originalPosition) {
        let point = computeMovePositionOutOfOrbit(center, xRadius, yRadius, originalPosition);
        if (point == null) {
            return null;
        }
        let cell = this.translateToCell(point, this.initialCellSize);
        while (this.isOccupied(cell.x, cell.y)) {
            point = computeMovePositionOutOfOrbit(center, xRadius, yRadius, originalPosition);
            if (point == null) {
                return null;
            }
            cell = this.translateToCell(point, this.microCellSize);
        }
        return cell;
    }

    moveEntityForSelectedDiscipline(entity, disciplineId, center, xRadius, yRadius) {
        if (entity.hasClass(disciplineId)) {
            this.removeEntityFromOccupied(entity);
            let cell = this.randomCellInOrbit(center, xRadius, yRadius);
            this.addEntityToOccupied(cell, entity);
            entity.selectedMoveTo(disciplineId, this.translateFromCell(cell));
        } else {
            const cell = this.randomCellOutOfOrbit(center, xRadius, yRadius, entity.originalPosition());
            if (cell != null) {
                this.removeEntityFromOccupied(entity);
                this.addEntityToOccupied(cell, entity);
                entity.unselectedMoveTo(disciplineId, this.translateFromCell(cell));
            }
        }
    }

    moveEntityForUnselectedDiscipline(entity, disciplineId) {
        this.removeEntityFromOccupied(entity);
        entity.resetPosition(disciplineId);
    }

    removeEntityFromOccupied(entity) {
        let pos = entity.position();
        let cell = this.translateToCell(pos, this.microCellSize);
        delete this.occupied[cell.x][cell.y];
    }

    addEntityToOccupied(cell, entity) {
        if (!(cell.x in this.occupied)) {
            this.occupied[cell.x] = {};
        }
        this.occupied[cell.x][cell.y] = entity;
    }
}

// this creates a unique DOM entity from a surveyData row
export class DOMEntity {
    constructor(responseEntity, point) {
        // console.log(responseEntity);
        const entityType = responseEntity.entityType;

        let clickableEntity = document.createElement('div');
        clickableEntity.id = responseEntity.id;

        // Make the starting point of the jitter animation random
        clickableEntity.style.animationDelay = `${Math.random() * -100}s`;

        clickableEntity.style.transition = "all 0.5s ease-in";
        clickableEntity.setAttribute(`data-type`, entityType);

        // collect all unique disciplines in a designated array
        for (let entityDiscipline of responseEntity.responses.disciplines) {
            // decorate icon with a recognisable className
            clickableEntity.classList.add(entityDiscipline.toLowerCase().replace(' ', ''));
        }
        clickableEntity.classList.add(`entity-container`, `icon`, `icon-${entityType}`);

        document.body.appendChild(clickableEntity);

        // we're adding the entity details container once, on the first hover, after that css does the showing and the hiding
        clickableEntity.addEventListener('mouseover', (event) => {
            if (!clickableEntity.querySelector('.entity-details')) {
                let details = this.showEntityDetails();
                details.style.setProperty('--marginScale', `.5em`); // initialize values.
                event.target.appendChild(details);
            }
        });

        this.responseEntity = responseEntity;
        this.clickableEntity = clickableEntity;
        this.taggedOriginalPosition = {tag: "origin", point};
        this.positionStack = [this.taggedOriginalPosition];
        this.moveToPosition();
    }

    showEntityDetails() {
        let entity = this.responseEntity;
        let entityDetails = document.createElement('div');
        // entityDetails.id            = 'd_' + entity.id;
        entityDetails.className = 'entity-details';
        entityDetails.innerHTML = `
            <div class='details'>${replaceUndefined(entity.responses.name)}</div>
            <div class='details'>${makeWebsiteLink(entity.responses.website, true)}</div>
            <div class='details'>${replaceUndefined(entity.responses.countryOfResidence)}</div>
            <div class="entity-details__disciplines details">${('disciplines' in entity.responses ? entity.responses.disciplines.join(' ') : '')}</div>
            <div class="entity-details__tools details">${('tools' in entity.responses ? entity.responses.tools.join(' ') : '')}</div>`;

        return entityDetails;
    }

    unselectedMoveTo(tag, point) {
        this.positionStack[0] = { tag, point };
        this.moveToPosition();
    }

    selectedMoveTo(tag, point) {
        if (this.positionStack.length === 1) {
            this.clickableEntity.classList.add('selected');
        }
        this.positionStack.push({ tag, point });
        this.moveToPosition();
    }

    moveForSelectedDiscipline(discipline, center, xRadius, yRadius) {
    }

    moveToPosition() {
        const { x, y } = this.position();
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
        const index = this.positionStack.findIndex(({ tag }) => tag === tagToReset);
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

// const global_section = document.querySelector('.blury-cover');
// const connection_card = document.querySelector('#connection-card');

// global_section.addEventListener('click', () => {
//     connection_card.style.display = "none";
//     global_section.style.display = "none";
// })


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

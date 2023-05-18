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

function responseIsOrContains(responses, fieldName, value) {
    if (!(fieldName in responses)) {
        return false;
    }
    let response = responses[fieldName];
    if (response === value) {
        return true;
    }
    return Array.isArray(response) && response.includes(value);
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
        this.types = {
            enthusiast: [],
            maker: [],
            organisation: [],
            contributor: [],
            venue: [],
            event: [],
            anonymous: [],
        };
        this.bluryCover = document.querySelector('.blury-cover');
        this.connectionCard = document.getElementById('connection-card');

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

        // 3 filters.
        for (const t in this.allFilters) {
            let divFilter = document.createElement('div');
            divFilter.classList.add('filter');
            divFilter.id = `filter-${t}`;
            divFilter.innerHTML = `<div id='${t}-filter'>+</div>`;

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

            //remove filters
            let filterelem = document.getElementById(`${t}-filter`);
            filterelem.addEventListener('click', (event) => {
                this.clearFilter(t, event.target.innerText);
            });
        }

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
            document.body,
        );

        // this is where we're creating the dom entities
        this.surveyData.map((responseEntity) => {
            this.processResponseEntity(responseEntity);
        });

        // update all type properties in top nav
        this.updateTypeProperties();

        // set total number of entities in top nav
        const totalCountContainer = document.querySelector(`.menu li:first-of-type`);
        totalCountContainer.setAttribute('data-value', this.surveyData.length);

        this.bluryCover.addEventListener('click', (e) => this.deactivateConnectionCard(e));

        document.addEventListener('click', (event) => {
            let classList = event.target.classList;
            if (classList.contains('entity-details__countryOfResidence')) {
                this.activateConnectionCard('countryOfResidence', 'Country', event.target.innerText);
            } else if (classList.contains('entity-details__discipline')) {
                this.activateConnectionCard('disciplines', 'Discipline', event.target.innerText);
            } else if (classList.contains('entity-details__tool')) {
                this.activateConnectionCard('tools', 'Tool', event.target.innerText);
            }
        });
    }

    deactivateConnectionCard() {
        this.connectionCardGrid.clearEntities();
        this.connectionCardGrid = null;
        this.connectionCard.style.display = "none";
        this.bluryCover.style.display = "none";
    }

    activateConnectionCard(fieldName, topLabel, value) {
        this.connectionCard.style.display = "initial";
        this.bluryCover.style.display = "initial";
        let header = document.getElementById("connection-card-header");
        let body = document.getElementById("connection-card-entities-space");
        header.innerHTML = `
<span id='connection-card-header-value' class='connection-card-header-${topLabel}'>${value}</span>
<span id='connection-card-header-field'>entities</span>
`;

        let bodyRectangle = body.getBoundingClientRect();
        const cellSize = 30;
        if (this.connectionCardGrid == null) {
            this.connectionCardGrid = new Grid(
                cellSize,
                bodyRectangle.top + cellSize,
                bodyRectangle.width - 2 * cellSize,
                bodyRectangle.height - 2 * cellSize,
                cellSize,
                body,
            );
        } else {
            this.connectionCardGrid.clearEntities();
        }

        this.surveyData.forEach(responseEntity => {
            let responses = responseEntity.responses;
            if (!responseIsOrContains(responses, fieldName, value)) {
                return;
            }
            this.connectionCardGrid.addEntity(responseEntity);
        })
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

        const name = responseEntity.responses.name;

        this.types[entityType].push(name);

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

    updateTypeProperties() {
        for (const [type, arr] of Object.entries(this.types)) {
            const typeContainer = document.querySelector(`.menu li.${type} p`);
            typeContainer.setAttribute('count', arr.length);
            typeContainer.setAttribute('entities', arr);
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

        colophonEntity.classList.add(`entity-container`, `colophon`, `icon`, `icon-colophon`);
        document.body.appendChild(colophonEntity);
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
        let getK = k.innerText.replace('- ', '');
        let getT = t.innerText.replace('- ', '');
        let getC = c.innerText.replace('- ', '');
        console.log(getK, getT, getC);
        let keyword = getK;
        let tool = getT;
        let country = getC;

        window.entities.map(i => {
            let entity = document.getElementById(i.id);
            let shadowColorK = 'transparent';
            let shadowColorT = 'transparent';
            let shadowColorC = 'transparent';

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

            // countryOfResidence
            let entityMatchesC = (i.responses.countryOfResidence === country)
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
        let f = document.getElementById(`${filtertype}-filter`);
        f.innerText = `- ${s}`;
        this.decorateEntities();
    }

    clearFilter(filtertype) {
        let f = document.getElementById(`${filtertype}-filter`);
        f.innerText = `+`;
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
    constructor(leftOffset, topOffset, width, height, cellSize, containingElement) {
        this.leftOffset = leftOffset;
        this.topOffset = topOffset;
        this.width = width;
        this.height = height;
        this.microCellRatio = 3;
        this.microCellSize = cellSize / this.microCellRatio;
        this.initialCellSize = cellSize;
        this.occupied = {};
        this.domEntities = []
        this.containingElement = containingElement;
    }

    addEntity(responseEntity) {
        let cell = this.randomCell();
        let domEntity = new DOMEntity(responseEntity, this.translateFromCell(cell), this.containingElement);
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
            x: this.leftOffset + x * this.microCellSize + this.microCellSize / 2,
            y: this.topOffset + y * this.microCellSize + this.microCellSize / 2,
        };
    }

    translateToCell({x, y}, cellSize) {
        return {
            x: Math.floor((x - this.leftOffset - this.microCellSize / 2) / cellSize) * (cellSize / this.microCellSize),
            y: Math.floor((y - this.topOffset - this.microCellSize / 2) / cellSize) * (cellSize / this.microCellSize),
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

    clearEntities() {
        this.domEntities.forEach((x) => x.remove());
    }
}

// this creates a unique DOM entity from a surveyData row
export class DOMEntity {
    constructor(responseEntity, point, containingElement) {
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

        containingElement.appendChild(clickableEntity);

        // we're adding the entity details container once, on the first hover, after that css does the showing and the hiding
        clickableEntity.addEventListener('mouseover', (event) => {
            if (!clickableEntity.querySelector('.entity-details')) {
                let details = this.showEntityDetails();
                details.style.setProperty('--marginScale', `.5em`); // initialize values.
                event.target.appendChild(details);
                let detailsRect = details.getBoundingClientRect();
                let parentRect = clickableEntity.parentElement.getBoundingClientRect();
                let rightAdjustPx = Math.max(0, detailsRect.right - parentRect.width);
                let bottomAdjustPx = Math.max(0, detailsRect.bottom - parentRect.height);
                if (rightAdjustPx > 0 || bottomAdjustPx > 0) {
                    details.style.transform = `translate(-${rightAdjustPx}px, -${bottomAdjustPx}px)`;
                }
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

        let toolAnchors = 'tools' in entity.responses ? entity.responses.tools.map(tool => `<a class='entity-details__tool'>${tool}</a>`).join(' ') : '';
        let disciplineAnchors = 'disciplines' in entity.responses ? entity.responses.disciplines.map(tool => `<a class='entity-details__discipline'>${tool}</a>`).join(' ') : '';

        let entityDetails = document.createElement('div');
        entityDetails.className = 'entity-details';
        entityDetails.innerHTML = `
            <div class='details'>${replaceUndefined(entity.responses.name)}</div>
            <div class='details'>${makeWebsiteLink(entity.responses.website, true)}</div>
            <div class='details'><a class='entity-details__countryOfResidence'>${replaceUndefined(entity.responses.countryOfResidence)}</a></div>
            <div class="entity-details__disciplines details">${disciplineAnchors}</div>
            <div class="entity-details__tools details">${toolAnchors}</div>`;
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

    remove() {
        this.clickableEntity.remove();
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

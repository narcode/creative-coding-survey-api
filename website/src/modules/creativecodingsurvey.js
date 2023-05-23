import { loadJSON } from '../utils/ajax.js';
import { randomInt, randomAngle, randomRange, randomInGrid } from '../utils/random.js';
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

function insideRect({x, y}, topLeft, width, height) {
    return x >= topLeft.x && y >= topLeft.y && x <= topLeft.x + width && y <= topLeft.y + height;
}

function collidesWithObstacles(point, obstacles) {
    return obstacles.some(rect =>
        insideRect(point, {x: rect.offsetLeft - 5, y: rect.offsetTop - 5}, rect.offsetWidth + 10, rect.offsetHeight + 10)
    );
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

        this.makeFilters();

        this.makeLinks();

        this.makeColophon();

        const topOffset = 60;
        const cellSize = 18;
        this.mainGrid = new Grid(
            0,
            topOffset,
            window.innerWidth,
            window.innerHeight - topOffset,
            cellSize,
            document.body,
            [
                document.getElementById("design").labels[0],
                document.getElementById("art").labels[0],
                document.getElementById("research").labels[0],
                document.getElementById("education").labels[0],
                document.getElementById("music").labels[0],
                document.getElementById("performance").labels[0],
                document.getElementById("science").labels[0],
                document.getElementById("livecoding").labels[0],
                document.getElementById("digitalculture").labels[0],
            ]
        );
        window.mainGrid = this.mainGrid;

        // this is where we're creating the dom entities
        this.surveyData.map((responseEntity) => {
            this.processResponseEntity(responseEntity);
        });

        this.mainGrid.populate(this.surveyData);

        // update all type properties in top nav
        this.updateTypeProperties();

        // set total number of entities in top nav
        const totalCountContainer = document.querySelector(`.menu li:first-of-type`);
        totalCountContainer.setAttribute('count', this.surveyData.length);

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
                0,
                bodyRectangle.top,
                bodyRectangle.width,
                bodyRectangle.height,
                cellSize,
                body,
                [],
            );
        } else {
            this.connectionCardGrid.clearEntities();
        }

        let relevantEntities =
            this.surveyData.filter(responseEntity => {
                let responses = responseEntity.responses;
                return responseIsOrContains(responses, fieldName, value);
            });
        this.connectionCardGrid.populate(relevantEntities);
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

        // Populate array for navigation with object desribing the entity
        this.types[entityType].push({
            id : responseEntity.id,
            name : responseEntity.responses.name
        });

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
    }

    updateTypeProperties() {
        for (const [type, arr] of Object.entries(this.types)) {
            // Update counter
            const typeContainer = document.querySelector(`.menu li.${type} p`);
            typeContainer.setAttribute('count', arr.length);

            const dropdownContainer = document.querySelector(`.menu li.${type} span.dropdown-content`);
            for (const item of arr) {
                let elemitem = document.createElement('span');
                elemitem.classList.add('dropdown-entity');

                elemitem.innerText = `${replaceUndefined(item.name)}`;
                elemitem.setAttribute('entity-id', item.id)

                // we're adding the entity details container once, on the first hover, after that css does the showing and the hiding
                elemitem.addEventListener('mouseover', (event) => {
                    let entity = document.getElementById(item.id);
                    console.log(entity)
                    let details = elemitem.querySelector('.entity-details');
                    
                    if (!details) {

                        details = entity.domEntity.showEntityDetails();
                        elemitem.appendChild(details);
                        let detailsRect = details.getBoundingClientRect();
                        let parentRect = document.body.getBoundingClientRect();
                        let rightAdjustPx = Math.max(0, detailsRect.right - parentRect.right);
                        if (rightAdjustPx > 0) {
                            details.style.transform = `translate(-${rightAdjustPx}px, 0px)`;
                        }        
                    
                    }

                    let parentSpan = elemitem.getBoundingClientRect();
                    let topAdjustPx = parentSpan.top;
                    let leftAdjustPx = parentSpan.right;

                    details.style.top = `${topAdjustPx}px`;
                    details.style.left = `${leftAdjustPx}px`;
                    details.style.display = 'flex';

                });

                elemitem.addEventListener('mouseout', (event) => {
                    let details = elemitem.querySelector('.entity-details');
                    details.style.display = 'none';
                })

                dropdownContainer.appendChild(elemitem);
            }
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
    constructor(leftOffset, topOffset, width, height, cellSize, containingElement, obstacles) {
        // We add some padding based on the cell size
        this.leftOffset = leftOffset + cellSize;
        this.topOffset = topOffset + cellSize;
        this.width = width - 2 * cellSize;
        this.height = height - 2 * cellSize;
        this.cellSize = cellSize;
        this.domEntities = [];
        this.containingElement = containingElement;
        this.obstacles = obstacles;
        this.heightInCells = Math.floor(this.height / this.cellSize);
        this.widthInCells = Math.floor(this.width / this.cellSize);
        this.nrCells = this.heightInCells * this.widthInCells;
        this.occupiedVector = {};
    }

    populate(responseEntities) {
        let randomGen = randomRange(0, this.nrCells, 1);
        responseEntities.forEach(e => {
            let index = randomGen.next().value;
            while (this.isOccupied(index)) {
                index = randomGen.next().value;
            }
            this.addEntity(index, e);
        });
    }

    addEntity(index, responseEntity) {
        let domEntity = new DOMEntity(responseEntity, this.translateFromIndex(index), this.containingElement);
        this.addEntityToOccupied(index, domEntity);
        this.domEntities.push(domEntity);
    }

    isOccupied(index) {
        return index in this.occupiedVector || collidesWithObstacles(this.translateFromIndex(index), this.obstacles);
    }

    indexToCell(i) {
        return {
            x: Math.floor(i % this.widthInCells),
            y: Math.floor(i / this.widthInCells),
        };
    }

    cellToIndex({x, y}) {
        return y * this.widthInCells + x;
    }

    pointToCell({x, y}) {
        return {
            x: Math.floor((x - this.leftOffset - this.cellSize / 2) / this.cellSize),
            y: Math.floor((y - this.topOffset - this.cellSize / 2) / this.cellSize),
        };
    }

    translateFromIndex(i) {
        let cell = this.indexToCell(i);
        return  {
            x: this.leftOffset + cell.x * this.cellSize + this.cellSize / 2,
            y: this.topOffset + cell.y * this.cellSize + this.cellSize / 2,
        };
    }

    translateToIndex(point) {
        return this.cellToIndex(this.pointToCell(point));
    }

    moveEntitiesForDiscipline(disciplineCheckbox) {
        const id = disciplineCheckbox.id;
        if (disciplineCheckbox.checked) {
            const label = disciplineCheckbox.labels[0];
            const extraDist = 10;
            const halfDist = extraDist / 2;
            const topLeft = this.pointToCell({
                x: label.offsetLeft,
                y: label.offsetTop,
            });
            topLeft.x -= halfDist;
            topLeft.y -= halfDist;
            const width = Math.floor(label.offsetWidth / this.cellSize + extraDist);
            const height = Math.floor(label.offsetHeight / this.cellSize + extraDist);
            this.domEntities.sort((a, b) => {
                return a.hasClass(id) ? 1 : -1;
            })
            let i = 0;
            let gen = randomRange(0, this.nrCells, 1);
            for (; i < this.domEntities.length; ++i) {
                let e = this.domEntities[i];
                if (e.hasClass(id)) {
                    break;
                }
                if (!insideRect(this.pointToCell(e.position()), topLeft, width, height)) {
                    continue;
                }
                let index = gen.next().value;
                while (index != null && (this.isOccupied(index) || insideRect(this.indexToCell(index), topLeft, width, height))) {
                    index = gen.next().value;
                }
                if (index == null) {
                    break;
                }
                this.removeEntityFromOccupied(e);
                this.addEntityToOccupied(index, e);
                e.unselectedMoveTo(id, this.translateFromIndex(index));
            }
            gen = randomInGrid(topLeft, width, height);
            for (; i < this.domEntities.length; ++i) {
                let e = this.domEntities[i];
                this.removeEntityFromOccupied(e);
                let index = this.cellToIndex(gen.next().value);
                while (index != null && this.isOccupied(index)) {
                    index = this.cellToIndex(gen.next().value);
                }
                if (index == null) {
                    break;
                }
                this.addEntityToOccupied(index, e);
                e.selectedMoveTo(id, this.translateFromIndex(index));
            }
        } else {
            this.domEntities.forEach((entity) => this.moveEntityForUnselectedDiscipline(entity, id));
        }
    }

    moveEntityForUnselectedDiscipline(entity, disciplineId) {
        this.removeEntityFromOccupied(entity);
        entity.resetPosition(disciplineId);
        let index = this.translateToIndex(entity.position());
        this.addEntityToOccupied(index, entity);
    }

    removeEntityFromOccupied(entity) {
        let index = this.translateToIndex(entity.position());
        delete this.occupiedVector[index];
    }

    addEntityToOccupied(index, entity) {
        this.occupiedVector[index] = entity;
    }

    clearEntities() {
        this.domEntities.forEach((x) => x.remove());
        this.occupiedVector = {};
        this.domEntities = [];
    }
}

// this creates a unique DOM entity from a surveyData row
export class DOMEntity {
    constructor(responseEntity, point, containingElement) {
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
        clickableEntity.domEntity = this;

        containingElement.appendChild(clickableEntity);

        // we're adding the entity details container once, on the first hover, after that css does the showing and the hiding
        clickableEntity.addEventListener('mouseover', (event) => {
            if (!clickableEntity.querySelector('.entity-details')) {
                let details = this.showEntityDetails();
                details.style.setProperty('--marginScale', `.5em`); // initialize values.
                event.target.appendChild(details);
                let detailsRect = details.getBoundingClientRect();
                let parentRect = clickableEntity.parentElement.getBoundingClientRect();
                let rightAdjustPx = Math.max(0, detailsRect.right - parentRect.right);
                let bottomAdjustPx = Math.max(0, detailsRect.bottom - parentRect.bottom);
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

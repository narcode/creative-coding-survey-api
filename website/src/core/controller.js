export default class Controller {

  constructor(el, options = {}) {

    this.el = el;

    return this;
  }

  static init() {
    // Override this method
  }

  destroy() {

    this.el.parentNode.removeChild(this.el);
  }
}
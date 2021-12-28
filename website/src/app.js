import * as conditioner from 'conditioner-core/conditioner-core.esm';
import './css/creativecodingsurvey.scss';

conditioner.addPlugin({
    // converts module aliases to paths
    moduleSetName: name => `./modules/${name}.js`,

    // use default exports as constructor
    moduleGetConstructor: module => module.default,
    //moduleGetDestructor: instance => { instance.destroy(); },

    // override the import (this makes webpack bundle all the dynamically included files as well)
    // https://webpack.js.org/api/module-methods/#import-
    // - set to "eager" to create a single chunk for all modules
    // - set to "lazy" to create a separate chunk for each module
    moduleImport: name => import(/* webpackMode: "eager" */ `${name}`)
});

// lets go!
conditioner.hydrate(document.documentElement);
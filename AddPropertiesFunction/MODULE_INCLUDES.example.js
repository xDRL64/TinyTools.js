"use strict";

var global = window || global;

import {AddPropertiesFunction as addProp} from './AddPropertiesFunction.js';
global.addProp = addProp;

/* document.addEventListener('DOMContentLoaded', function(){
	addProp();
}); */
'use strict';
const base=require('./package.json').build;
// The unified installer puts the web library beside desktop/, not inside it.
module.exports={...base,extraResources:[],directories:{output:'dist-unified'}};

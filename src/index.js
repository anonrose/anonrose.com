import "./index.css"

import CircleThing from './circle-thing';

window.onresize = window.onload = new CircleThing('circle-svg').paint();

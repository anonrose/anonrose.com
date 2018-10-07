import "./index.css"
import { Manifest } from 'progressive-web-app-helper';
import { config } from '../config/manifest';

import CircleThing from './circle-thing';

window.onresize = window.onload = new CircleThing('circle-svg').paint();

Manifest.inject(config);

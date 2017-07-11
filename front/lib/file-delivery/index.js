/*jshint node:true*/
'use strict';

var path = require('path');
var fs = require('fs-extra');

module.exports = {
  name: 'file-delivery',

  config: function(environment, appConfig) {
    this.environment = environment;
  },

  mover: function mover(src, dest) {
    fs.copy(src, dest, { replace: false }, function (err) {
      if (err) {
        throw err;
      }
      console.log(src.split('/').pop() + ' => ' + dest);
    });
  },

  outputReady: function(result) {

    var assetsPath = path.join(process.cwd(), '/dist'),
        backEndPath = path.join(process.cwd(), '../back/assets');

      var paths = [
        [ `${assetsPath}/app.css`,      `${backEndPath}/app.css`    ],
        [ `${assetsPath}/app.css.map`,  `${backEndPath}/app.css.map`],
        [ `${assetsPath}/app.js`,       `${backEndPath}/app.js`     ],
        [ `${assetsPath}/app.js.map`,   `${backEndPath}/app.js.map` ],
        [ `${assetsPath}/index.html`,   `${backEndPath}/index.html` ],
        [ `${assetsPath}/robots.txt`,   `${backEndPath}/robot.txt`  ]
      ];

      paths.forEach(([src, dest]) => this.mover(src, dest));
  }
};

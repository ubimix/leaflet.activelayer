var UmxGruntConfig = require('umx-grunt-config');
module.exports = function(grunt) {
    var configurator = new UmxGruntConfig(require, grunt);
    configurator.initBump();
    configurator.initWebpack({
        main : './index',
        externals : [ 'leaflet' ]
    });
    configurator.initWatch();
    configurator.initJshint();
    configurator.initMochaTest();
    configurator.initUglify();
    configurator.registerBumpTasks();
    grunt.initConfig(configurator.config);
    grunt.registerTask('test', [ 'jshint', 'mochaTest' ]);
    grunt.registerTask('build', [ 'test', 'webpack' ]);
    grunt.registerTask('build-min', [ 'build', 'uglify' ]);
    grunt.registerTask('commit', [ 'build-min', 'bump-commit' ]);
    grunt.registerTask('default', [ 'build-min' ]);
}

var Promise = require("montage/core/promise").Promise;

exports.run = function( suiteRequire, modules ) {

    var spec = queryString("spec");
    if (spec) {
        suiteRequire.async(decodeURIComponent(spec)).then(function() {
            jasmine.getEnv().execute();
        }).done();
    } else {
        Promise.all(modules.map(suiteRequire.deepLoad))
        .then(function () {
            modules.forEach(suiteRequire);
            jasmine.getEnv().execute();
        }).then(function() {
            console.warn("loaded");
            if (window.__testacular__) {
                window.__testacular__.loaded();
            }
        });
    }
}

"use strict";

// TODO: use npm to manage bluebird once it hits 3.0
var Promise = require("support/bluebird");

// better bluebird debugging
Promise.longStackTraces();

var jasmineEnv = jasmine.getEnv();
jasmineEnv.updateInterval = 1000;

exports.run = function (suiteRequire, modules) {
    var spec = queryString("spec");

    if (spec) {
        suiteRequire.async(decodeURIComponent(spec))
            .then(function () {
                jasmineEnv.execute();
            });

    } else {
        Promise.all(modules.map(suiteRequire.deepLoad))
            .then(function () {
                modules.forEach(suiteRequire);
                jasmineEnv.execute();
            })
    }
};

//if (jasmine.HtmlReporter) {
//    jasmineEnv.addReporter(jasmine.HtmlReporter);
//}
//
//if (jasmine.JsApiReporter) {
//    jasmineEnv.addReporter(new jasmine.JsApiReporter());
//}
//
//if (jasmine.JSReporter) {
//    jasmineEnv.addReporter(new jasmine.JSReporter());
//}

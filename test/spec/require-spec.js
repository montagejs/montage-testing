  /*global require,exports,describe,it,expect */
describe("require-spec", function () {
  
  beforeEach(function () {
    /* ... Set up your object ... */
  });
  
  afterEach(function () {
    /* ... Tear it down ... */
  }); 

  // 
  it("load core module", function () {
    var montageRequire = require("montage/core/core");
    expect(typeof montageRequire.Montage).toEqual("function");
  });

  // NodeJS TODO: Error: Expected 'undefined' to equal 'function'.
  // Require montage patch for nodeJS (montage 17.0.1)
  xit("load alias module", function () {
    var montageRequire = require("montage");
    expect(typeof montageRequire.Montage).toEqual("function");
  });

  // TODO Error: Can't require module "core/mini-url" via "" because Can't XHR "http://localhost:8080/node_modules/montage/core/mini-url.js"
  // Require montage patch for montage/core/mini-url nodeJS support (montage 17.0.1)
  xit("load inject module", function () {
    var URL = require("montage/core/mini-url");
    expect(typeof URL.resolve).toEqual("function");
  });

  it("load test-controller module", function () {
    var TestController = require('montage-testing/test-controller').TestController;
    expect(typeof TestController).toEqual("function");
  });

});
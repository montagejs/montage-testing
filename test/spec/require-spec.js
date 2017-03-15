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
    var montageRequire = require("montage");
    expect(typeof montageRequire.Montage).toEqual("function");
  });

  // TODO Error: Can't require module "core/mini-url" via "" because Can't XHR "http://localhost:8080/node_modules/montage/core/mini-url.js"
  xit("load core alias module", function () {
    var URL = require("montage/core/mini-url");
    expect(typeof URL.resolve).toEqual("function");
  });

  it("load test-controller module", function () {
    var TestController = require('montage-testing/test-controller').TestController;
    expect(typeof TestController).toEqual("function");
  });

});
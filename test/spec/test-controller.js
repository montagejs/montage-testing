
describe("test-controller", function () {
	
	beforeEach(function () {
		/* ... Set up your object ... */
	});
	
	afterEach(function () {
		/* ... Tear it down ... */
	});

	var TestController = require('montage-testing/test-controller').TestController;
	
	it("load test-controller module", function () {
		expect(typeof TestController).toEqual("function");
	});
});
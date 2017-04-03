/*global require,exports,describe,it,expect */
var Montage = require("montage").Montage,
    TestPageLoader = require("montage-testing/testpageloader").TestPageLoader;

TestPageLoader.queueTest("application/as-application", {src: "spec/application/as-application.html"}, function (testPage) {
    describe("application-spec", function () {
        describe("Application used in application label", function () {
            it("should draw correctly", function () {
                expect(testPage.test).toBeDefined();
            });

            it("should be THE application", function () {
                expect(testPage.test.theOne).toEqual("true");
            });
        });
   });
});

TestPageLoader.queueTest("application/as-owner", {src: "spec/application/as-owner.html"}, function (testPage) {
    describe("application-spec", function () {
        describe("Application used in owner label", function () {
            it("should draw correctly", function () {
                expect(testPage.test).toBeDefined();
            });
        });
   });
});

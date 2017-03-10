console.log('montage-testing', 'Start');
require("montage-testing").run(require, [
    {"name": 'spec/application-spec', "node": false},
    'spec/test-controller'
]).then(function () {
	console.log('montage-testing', 'End');
}, function (err) {
	console.log('montage-testing', 'Fail', err, err.stack);
});
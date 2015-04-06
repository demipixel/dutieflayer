var Dutie = require('../');
var Task = Dutie.Task;
var CallTask = Dutie.CallTask;
var RunTask = Dutie.RunTask;

var Manager = new Dutie();

function addNumbers(a, b, callback) {
	setTimeout(function() { callback(a+b); }, 1000);
}

function squareNumber(a, callback) {
	setTimeout(function() { callback(a*a); }, 2000);
}

var main = new RunTask(run, [], { complete: function() { console.log('Complete main') }});

function run(runManager) {
	console.log('Starting main');
	
	var task = new CallTask(addNumbers, [2, 4], { complete: function(num) { console.log('task: ' + num); } });
	var task_next = new CallTask(squareNumber, [5], { complete: function(num) { console.log('task_next: ' + num); }, priority: 1 });
	
	runManager.add(task).add(task_next);
}


main.addTo(Manager);
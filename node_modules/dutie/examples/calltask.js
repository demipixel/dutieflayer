var Dutie = require('../');
var Task = Dutie.Task;
var CallTask = Dutie.CallTask;

var Manager = new Dutie();

function addNumbers(a, b, callback) {
	setTimeout(function() { callback(a+b); }, 1000);
}

function squareNumber(a, callback) {
	setTimeout(function() { callback(a*a); }, 2000);
}

var task = new CallTask(addNumbers, [2, 4], { complete: function(num) { console.log('task: ' + num); } });
var task_next = new CallTask(squareNumber, [5], { complete: function(num) { console.log('task_next: ' + num); }, priority: 1 });

Manager.add(task).add(task_next);

/*
Both tasks are added to the manager

task is added first so it starts the callback.
task_next has a higher priority so it cancels task.

task_next finishes two seconds later so task starts back up again.
task finishes one second later.

*/
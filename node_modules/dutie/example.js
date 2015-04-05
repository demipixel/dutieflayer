var Dutie = require('./');
var Task = Dutie.Task;

var Manager = new Dutie();

var data = { num: 1 };
var task = new Task(function(a) { return a.num < 0 }, [data], { priority: 3, actPriority: 6});
var next_task = new Task(function(a) { return a.num > 15 }, [data], { priority: 5, actPriority: 8, check: function(a) {
	return a.num > 10;
}, checkParams: [data]});
var last_task = new Task(function(a) { return a.num < -10}, [data], { priority: 10, actPriority: 10, finish: function() {
	console.log('Task 3 finished!');
}});
var depend_task = new Task(function(a) { return a.num > 0 }, [data], { priority: 100, actPriority: 100});
depend_task.dependOn(next_task); // Task 4 depend on Task 2





Manager.add(task); // Add Task 1
Manager.update(); // Update because we can
console.log(Manager.currentTask); // Task 1
console.log('= = = = = ='); // Task 1

Manager.add(next_task); // Add Task 2, less than actPriority so it does not overtake
console.log(Manager.currentTask);
console.log('= = = = = ='); // Task 1

data.num = -1; // num less than 0 so Task 1 will get removed. Task 2 not added because it's check function prevents it until num > 10
Manager.update();
console.log(Manager.currentTask);
console.log('= = = = = ='); // null

data.num = 12; // Task 2 can now be added.
Manager.update();
console.log(Manager.currentTask);
console.log('= = = = = ='); // Task 2

Manager.add(last_task); // Add Task 3, priority (10) > actPriority of Task 2 (8), overtakes
console.log(Manager.currentTask);
console.log('= = = = = ='); // Task 3

data.num = -11; // data less than -10, Task 3 over, left with Task 2... But Task 2's check stops itself
Manager.update();
console.log(Manager.currentTask);
console.log('= = = = = ='); // Null

data.num = 12; // Get Task 2 over the check but not completed yet
Manager.update();
console.log(Manager.currentTask);
console.log('= = = = = ='); // Task 2

Manager.add(depend_task); // Add Task 4, priority is 100 but depends on Task 2 (not finished yet)
console.log(Manager.currentTask);
console.log('= = = = = ='); // Task 2

data.num = 25; // num over 15, Task 2 over, left with Task 4 who updates and completes (num > 0), left with null
Manager.update();
console.log(Manager.currentTask);
console.log('= = = = = ='); // null
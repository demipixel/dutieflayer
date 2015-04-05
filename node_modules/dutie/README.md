# dutie
Task Scheduling for Node.js!

# Installing
```
npm install dutie // Some day, but this doesn't actually work yet
```

# Task Manager

NOT BEFORE YOU START USING THIS:

ALL PARAMATERS MUST BE OBJECTS. IF IT IS A NUMBER, DO SOMETHING LIKE { num: 2 } TO CONTAIN 2. I apologize for the inconvenience. If you know of another way for Arrays to contain pointers for primitives, please notify me :)

```js
var Dutie = require('dutie');
```
## Variables
### Dutie.tasks
Array of tasks waiting to be called.
This sorts itself by priority when choosing next task. Don't expect it to be sorted any other time.

### Dutie.currentTask
Current Task object that is running.

## Methods
### Dutie.init()
Just calls Dutie.update() which will recognize it has no task and needs to get one.
It's pretty much just for the looks.

### Dutie.add(Task)
Add the task to Dutie.tasks
Will checkAll to see if there are any changes or if the current one needs to be cancelled.

### Dutie.update()
Update the current task. This will run anything in it's update method. If the update method return true, is will finish the task and try and get the next one.
If finishing, will pass false to the cancel paramater in the finish method.

### Dutie.finish()
Force-finishes the task but still calls the task's Finish method. Bypasses whatever decision update() would have made.
It will then decide what task is next.
Will pass "true" to the cancel paramater in the finish method.

### Dutie.cancel()
Calls the Task.finish(true), then adds it back to the list.
WARNING: This will leave currentTask as null unless you do something about it!
You're probably not gonna use this one since we take care of priority canceling.

### Dutie.endTask()
Murder the current task. Guillotine it and don't call its finish. Still replaces itself.
I don't recommend killing your fellow tasks. Just use finish even if you don't have a finish method.

### Dutie.checkAll()
Calls Task.check() on every task. This COULD change the current task if a Task.check() passes true and has a higher priority than the current Task!
Every task is checked when deciding the next Task, so don't worry about it if you don't have to.


# Tasks
```js
var Task = Dutie.Task
```
### Task.depend
An array of Tasks it depends on to finish. Tasks will be removed from the list if they have finished/failed/ended
The Task cannot execute until this array is empty.

### TaskA.dependOn(TaskB)
Will push TaskB to TaskA.depend

### Task.update()
Update method that you pass. Change if you must... or just write a better update method that you don't have to change.
The update method gets called whenever you wants to. It allows you to complete your action or return true to end it.

### Task.updateParams
Array of params to be called with each update. This is why you do Dutie.update() instead of Task.update().
Silly goose.

### Task.finish
When a task finishes (if you weren't silly enough to use Dutie.endTask()) this method will be called.
**IMPORTANT:** The "cancel" paramater comes before any of your custom paramaters. This means if you have:
[a, b, c] in your finishParams, it will call Task.finish(cancel, a, b, c). Thank you for your time :)

### Task.finishParams
Same as Task.updateParams but for finish. Remember that important note in Task.finish.
Silly goose.

### Task.check
Method that is run to check if you can execute the task.
This is if you want to depend on something that is not a task.
If you want to be able to execute the task, return true.

### Task.checkParams
What do you think. It's Task.finishParams for check.
Silly. Goose.




### new Task(update, updateParam, options)
Congrats! You've created your new Task object! But what do you put in it?

#### update
This is your update method! Put in here what you'd like to do during your task. Once your task is complete, return true!

#### updateParam
Your update is going to be called with these paramaters, just for you. Make them count!
Just in case you're wondering: this is an array.

#### priority
Explained in other places. Prioritises which task should be executed first.

#### actPriority
Also explained it other places. How much priority it has while executing.

#### Options
Alright, you've made it this far. What are the options?

##### priority
Default is 0.
Recommended that you set it. Will come before any other task with a lower priority.
Will even bump current task down if it has a lower act-priority.
Think of this as "how important is it that the task starts".

##### actPriority
Default is 0.
Short for "active priority". This is normally higher than priority, as it is how much priority the task has when executing.
Remember, anything with a higher priority could cancel this, so sets this high if you shouldn't / can't stop it.
Think of this as "how important is it that the task finishes now"

##### finish
Default is undefined, will not run anything.
What do you want to have happen when update returns true and the task finishes. Your first param will be false, the others being the paramaters you created.
WAIT, THAT'S NOT ALL! If your task gets cancelled, your update won't know about it! This means that finish will pass the first paramater ("cancel") to be true so you know to clean up after yourself if you get cancelled.

##### finishParms
I don't think I need to explain this one. check Task.finishParams. IT'S AN ARRAY

##### check
Not needed if it has no prerequisites.
See Task.check

##### checkParams
You've got to be joking.

##### EXAMPLE TIME
Let's say you have a Minecraft bot that needs to mine ore and then go home but then runs into a zombie!
```js
var Dutie = require('dutie');
var Task = Dutie.Task;

var Manager = new Dutie();

var mine = new Task(mineOreFunction, [], { priority: 3, actPriority: 6, finish: function(bot) {
	bot.stopMining();
	bot.navigate.stop();
}, finishParam: [bot]}); // Mine ore task
var home = new Task(goHomeFunction, [true], { priority: 4, actPriority: 8}); // Go home task, passing "true" paramater as an example
home.dependOn(mine); // Bot cannot go home until it finishes mining (or mining fails / ends)

Manager.add(mine).add(home);

/////////////// / / /
/// Somewhere else
/////////////// / / /

var zombie = new Task(killZombieFunction, [], { priority: 20, actPriority: 20});
Manager.add(zombie); // Will now cancel the mine task, adding it back into the line, and make zombie the current (since it has a higher priority then mine's actPriority)

/////////////// / / /  /   /   /
/// Somewhere else... again...
/////////////// / / /  /   /   /

// Let's sleep when we get home
// We don't know if there's a home task or not though (or we don't remember which one)
// Instead, we give a "check" with makes it dependent on something other than a task.

var sleep = new Task(goToSleep, ['home'], { priority: 3, actPriority: 3, check: function(bot) {
	if (bot.position.atHome()) return true;
	return false;
}, checkParams: [bot]});
Manager.add(sleep);

Manager.checkAll(); // This is automatically called at the end of a task, at a cancel, etc, but feel free to call it yourself if you need to
// Returns false because not at home.

// Even if it does return true, it needs to have a higher priority than actPriority to overtake
// Or it needs the highest priority in the list at the end of a task.
```
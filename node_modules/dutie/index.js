



function Dutie() {
	
	this.tasks = Array();
	this.currentTask = null;
	
	this.init = function() {
		this.update();
	}
	
	this.update = function() {
		if (this.currentTask) {
			var val = this.currentTask.update.apply(null, this.currentTask.updateParams);
			if (val) this.finish();
		} else this.checkAll();
	}
	
	this.add = function(Task) {
		this.tasks.push(Task);
		this.checkAll();
		return this;
	}
	
	this.sortTasks = function() {
		this.tasks.sort(function(a, b) {
			if (a.priority > b.priority) return 1;
			if (a.priority == b.priority) return 0;
			else return -1;
		});
	}
	
	this.nextTask = function() {
		this.currentTask = null;
		if (this.tasks.length == 0) return;
		this.sortTasks();
		for (var i = 0; i < this.tasks.length; i++) {
			var t = this.tasks[i];
			if ((!t.check || t.check.apply(null, t.checkParams)) && t.depend.length == 0) {
				this.currentTask = this.tasks.splice(i, 1)[0]; // 2 in 1! Remove and add!
				this.update();
				break;
			}
		}
		this.checkAll();
	}
	
	this.finish = function() {
		var param = [false].concat(this.currentTask.finishParams);
		if (this.currentTask.finish) this.currentTask.finish.apply(null, param);
		this.currentTask.completed = true;
		this.nextTask();
	}
	
	this.cancel = function() {
		var param = [true].concat(this.currentTask.finishParams);
		if (this.currentTask.finish) this.currentTask.finish.apply(null, param);
		this.tasks.push(this.currentTask);
		this.currentTask = null;
	}
	
	this.endTask = function() {
		this.currentTask.completed = true;
		this.currentTask = null;
		// You murderer.
	}
	
	this.checkAll = function() {
		this.sortTasks();
		for (var i = 0; i < this.tasks.length; i++) {
			var t = this.tasks[i];
			t.checkDepend();
			if ((!t.check || t.check.apply(null, t.checkParams)) && t.depend.length == 0) {
				if (!this.currentTask) {
					this.currentTask = this.tasks.splice(i, 1)[0];
					this.update();
					break;
				} else if (t.priority > this.currentTask.actPriority) {
					this.cancel();
					this.currentTask = this.tasks.splice(i, 1)[0];
					this.update();
					break;
				}
			}
		}
	}
}

Dutie.Task = function(update, updateParam, options) {
	this.depend = Array();
	this.completed = false;
	
	this.dependOn = function(tsk) {
		this.depend.push(tsk);
	}
	
	this.priority = 0;
	this.actPriority = 0;
	
	this.update;
	this.updateParams;
	this.finish;
	this.finishParams;
	this.check;
	this.checkParams;
	
	this.init = function(up, upParam, opt) {
		if (!up) throw Error('You need an update function to create a task');
		
		this.update = up;
		this.updateParams = upParam || Array();
		
		this.finish = opt.finish || null;
		this.finishParams = opt.finishParams || Array();
		this.check = opt.check || null;
		this.checkParams = opt.checkParams || Array();
		
		this.priority = opt.priority || 0;
		this.actPriority = opt.actPriority || 0;
	}
	this.init(update, updateParam, options);
	
	this.checkDepend = function() {
		for (var i = 0; i < this.depend.length; i++) {
			if (this.depend[i].completed) {
				this.depend.splice(i, 1);
				return this.checkDepend();
			}
		}
	}
}

module.exports = Dutie;




function Dutie() {
	
	this.tasks = Array();
	this.currentTask = null;
	this.parent = null;
	this.paused = false;
	
	this.activeCallback;
	
	this.init = function() {
		this.update();
	}
	
	this.update = function() {
		if (!this.currentTask && this.tasks.length == 0) return;
		if (this.currentTask) {
			if (this.currentTask.update) {
				var val = this.currentTask.update.apply(this, this.currentTask.updateParams);
				if (val) this.finish();
				return val;
			}
		} else this.checkAll();
		return false;
	}
	
	this.start = function() {
		if (!this.currentTask && this.tasks.length == 0) return;
		if (this.currentTask) {
			if (this.currentTask.start) {
				var val = this.currentTask.start.apply(this, this.currentTask.startParams);
				if (val) this.finish();
				this.updateParent();
				if (this.currentTask && this.currentTask.managerUpdate) this.currentTask.managerUpdate();
				return val;
			}
		} else this.checkAll();
		return false;
	}
	
	this.add = function(task) {
		this.tasks.push(task);
		task.added = true;
		task.parent = this;
		this.checkAll();
		return this;
	}
	
	this.addAll = function(task) {
		task.addAllTo(this);
	}
	
	this.sortTasks = function() {
		this.tasks.sort(function(a, b) {
			if (a.priority > b.priority) return -1;
			if (a.priority < b.priority) return 1;
			return 0;
		});
	}
	
	this.nextTask = function() {
		this.currentTask = null;
		if (this.tasks.length == 0) this.updateParent();
		this.sortTasks();
		for (var i = 0; i < this.tasks.length; i++) {
			var t = this.tasks[i];
			if ((!t.check || t.check.apply(this, t.checkParams)) && t.depend.length == 0) {
				this.currentTask = this.tasks.splice(i, 1)[0]; // 2 in 1! Remove and add!
				this.start();
				this.update();
				break;
			}
		}
		this.checkAll();
		this.updateParent();
	}
	
	this.finish = function() {
		console.log('disTasks '+this.tasks);
		if (this.currentTask && !this.currentTask.completed) {
			this.currentTask.completed = true;
			var param = [false].concat(this.currentTask.finishParams);
			if (this.currentTask.finish) this.currentTask.finish.apply(this, param);
			if (this.currentTask.complete) this.currentTask.complete.apply(this, this.currentTask.completeParams);
			if (!this.currentTask) return;
		}
		this.nextTask();
	}
	
	this.cancel = function() {
		if (!this.currentTask) return;
		
		var param = [true].concat(this.currentTask.finishParams);
		if (this.currentTask.finish) this.currentTask.finish.apply(this, param);
		if (this.currentTask.cancel) this.currentTask.cancel.apply(this, this.currentTask.cancelParams);
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
			if ((!t.check || t.check.apply(this, t.checkParams)) && t.depend.length == 0) {
				if (!this.currentTask) {
					this.currentTask = this.tasks.splice(i, 1)[0];
					this.start();
					this.updateParent();
					return this.update();
				} else if (t.priority > this.currentTask.actPriority) {
					this.cancel();
					this.currentTask = this.tasks.splice(i, 1)[0];
					this.start();
					this.updateParent();
					return this.update();
				}
			}
		}
	}
	
	this.updateParent = function() {
		if (this.parent) {
			this.parent.managerUpdate();
		}
	}
	
	this.pause = function() {
		if (!this.paused) {
			this.cancel();
			this.paused = true;
		}
	}
	
	this.resume = function() {
		if (!this.currentTask && this.paused) {
			this.nextTask();
			this.paused = false;
		}
	}
}

Dutie.Task = function(update, updateParam, options, cb) {
	this.depend = Array();
	this.dependers = Array();
	this.completed = false;
	this.cb = cb || false;
	this.parent = null;
	this.added = false;
	
	this.dependOn = function(tsk) {
		this.depend.push(tsk);
		tsk.dependers.push(this);
		return tsk;
	}
	
	this.dependBy = function(tsk) {
		this.dependers.push(tsk);
		tsk.depend.push(this);
		return tsk;
	}
	
	this.priority = 0;
	this.actPriority = 0;
	
	this.start;
	this.startParams;
	this.update;
	this.updateParams;
	this.finish;
	this.finishParams;
	this.check;
	this.checkParams;
	this.cancel;
	this.cancelParams;
	this.complete;
	this.completeParams;
	
	this.init = function(up, upParam, opt) {
		if (!up) throw Error('You need an update function to create a task');
		opt = opt || {};
		
		this.update = up;
		this.updateParams = upParam || Array();
		
		this.start = opt.start || null;
		this.startParams = opt.startParams || Array();
		this.finish = opt.finish || null;
		this.finishParams = opt.finishParams || Array();
		this.check = opt.check || null;
		this.checkParams = opt.checkParams || Array();
		this.cancel = opt.cancel || null;
		this.cancelParams = opt.cancelParams || Array();
		this.complete = opt.complete || null;
		this.completeParams = opt.completeParams || Array();
		
		this.priority = opt.priority || 0;
		this.actPriority = opt.actPriority || this.priority;
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
	
	this.addTo = function(manager) {
		manager.add(this);
	}
	
	this.addAllTo = function(manager) {
		this.addTo(manager);
		
		for (var i = 0; i < this.depend.length; i++) {
			if (!this.depend[i].added) this.depend[i].addAllTo(manager);
		}
		
		for (var i = 0; i < this.dependers.length; i++) {
			if (!this.dependers[i].added) this.dependers[i].addAllTo(manager);
		}
	}
}

Dutie.CallTask = function(call, callParam, options, cb) {
	this.depend = Array();
	this.dependers = Array();
	this.completed = false;
	this.cb = cb || false;
	this.parent = null;
	this.added = false;
	
	var self = this;
	
	this.dependOn = function(tsk) {
		this.depend.push(tsk);
		tsk.dependers.push(this);
		return tsk;
	}
	
	this.dependBy = function(tsk) {
		this.dependers.push(tsk);
		tsk.depend.push(this);
		return tsk;
	}
	
	this.priority = 0;
	this.actPriority = 0;
	
	this.start = function(ar) {
		
		this.activeCallback = self.callback;
		
		var params = self.callParams;
		if (self.location != -1) params[self.location] = self.callback;
		else params = params.concat(self.callback);
		
		var val = false;
		if (self.startFunc) val = self.startFunc.apply(this, self.startParams);
		if (val) return true;
		
		self.callFunc.apply(this, params);
		return false;
	}
	
	this.finish = function(cancel) {
		if (self.finishFunc) self.finishFunc.apply(this, [cancel].concat(self.finishParams));
		self.finishParams = Array();
		self.cancelParams = Array();
		self.competeParams = Array();
	}
	
	this.callback = function() {
		if (self.callback == self.parent.activeCallback) {
			self.finishParams = self.completeParams = self.cancelParams = Array.prototype.slice.call(arguments);
			self.parent.finish();
		}
	}
	
	this.callFunc;
	this.callParams;
	
	this.startFunc;
	this.startParams;
	this.update;
	this.updateParams;
	this.finishFunc;
	this.finishParams; // Set by callback
	this.check;
	this.checkParams;
	this.cancel;
	this.cancelParams;
	this.complete;
	this.completeParams;
	this.location;
	
	this.init = function(ca, caParam, opt) {
		if (!ca) throw Error('You need a call function to create a CallTask');
		opt = opt || {};
		
		this.callFunc = ca;
		this.callParams = caParam || Array();
		
		this.startFunc = opt.start || null;
		this.startParams = opt.startParams || Array();
		this.update = opt.update || null;
		this.updateParams = opt.updateParams || Array();
		this.finishFunc = opt.finish || null;
		this.check = opt.check || null;
		this.checkParams = opt.checkParams || Array();
		this.cancel = opt.cancel || null;
		this.cancelParams = opt.cancelParams || Array();
		this.complete = opt.complete || null;
		this.completeParams = opt.completeParams || Array();
		
		this.location = (opt.location || opt.location === 0) ? opt.location : -1;
		
		this.priority = opt.priority || 0;
		this.actPriority = opt.actPriority || this.priority;
	}
	this.init(call, callParam, options);
	
	this.checkDepend = function() {
		for (var i = 0; i < this.depend.length; i++) {
			if (this.depend[i].completed) {
				this.depend.splice(i, 1);
				return this.checkDepend();
			}
		}
	}
	
	this.addTo = function(manager) {
		manager.add(this);
		return this;
	}
	
	this.addAllTo = function(manager) {
		this.addTo(manager);
		
		for (var i = 0; i < this.depend.length; i++) {
			if (!this.depend[i].added) this.depend[i].addAllTo(manager);
		}
		for (var i = 0; i < this.dependers.length; i++) {
			if (!this.dependers[i].added) this.dependers[i].addAllTo(manager);
		}
		return this;
	}
}




Dutie.RunTask = function(start, startParam, options, cb) {
	this.depend = Array();
	this.dependers = Array();
	this.completed = false;
	this.cb = cb || false;
	this.parent = null;
	this.added = false;
	
	var self = this;
	
	this.manager = new Dutie();
	this.manager.parent = this;
	
	this.dependOn = function(tsk) {
		this.depend.push(tsk);
		tsk.dependers.push(this);
		return tsk;
	}
	
	this.dependBy = function(tsk) {
		this.dependers.push(tsk);
		tsk.depend.push(this);
		return tsk;
	}
	
	this.priority = 0;
	this.actPriority = 0;
	
	this.start = function() {
		self.manager.resume();
		if (self.showManager) return self.startFunc.apply(this, [self.manager].concat(Array.prototype.slice.call(arguments)));
		else return self.startFunc.apply(this, Array.prototype.slice.call(arguments));
	}
	
	this.finish = function(cancel) {
		if (cancel) self.manager.pause();
		if (self.finishFunc) self.finishFunc.apply(this, Array.prototype.slice.call(arguments));
	}
	
	this.managerUpdate = function() {
		if (this.manager.tasks.length == 0 && !this.manager.currentTask) {
			console.log(this.parent.currentTask);
			console.log('= = = = = = = = = =');
			this.parent.finish();
		}
	}
	
	this.startFunc;
	this.startParams;
	this.update;
	this.updateParams;
	this.finishFunc;
	this.finishParams;
	this.check;
	this.checkParams;
	this.cancel;
	this.cancelParams;
	this.complete;
	this.completeParams;
	
	this.showManager = true;
	
	this.init = function(st, stParam, opt) {
		if (!st) throw Error('You need a start function to create a RunTask');
		opt = opt || {};
		
		this.startFunc = st;
		this.startParams = stParam || Array();
		
		this.update = opt.update || null;
		this.updateParams = opt.updateParams || Array();
		this.finishFunc = opt.finish || null;
		this.finishParams = opt.finishParams || Array();
		this.check = opt.check || null;
		this.checkParams = opt.checkParams || Array();
		this.cancel = opt.cancel || null;
		this.cancelParams = opt.cancelParams || Array();
		this.complete = opt.complete || null;
		this.completeParams = opt.completeParams || Array();
		this.showManager = (opt.manager || opt.manager === false) ? opt.manager : true;
		
		this.priority = opt.priority || 0;
		this.actPriority = opt.actPriority || this.priority;
	}
	this.init(start, startParam, options);
	
	this.checkDepend = function() {
		for (var i = 0; i < this.depend.length; i++) {
			if (this.depend[i].completed) {
				this.depend.splice(i, 1);
				return this.checkDepend();
			}
		}
	}
	
	this.addTo = function(manager) {
		manager.add(this);
	}
	
	this.addAllTo = function(manager) {
		this.addTo(manager);
		
		for (var i = 0; i < this.depend.length; i++) {
			if (!this.depend[i].added) this.depend[i].addAllTo(manager);
		}
		
		for (var i = 0; i < this.dependers.length; i++) {
			if (!this.dependers[i].added) this.dependers[i].addAllTo(manager);
		}
	}
}

Dutie.prototype.toString = function() {
	var str = '[ Dutie Manager';
	
	str += 'Current Task:' + this.currentTask;
	str += '\nTasks: \n' + this.tasks;
	str += '\n\nHas parent: ' + (this.parent ? 'true' : 'false')
	
	str += '\n]';
	return str;
	
}

Dutie.Task.prototype.toString = function() {
	var str = '{ Dutie Task\n';
	
	if (this.priority || this.actPriority) str += '\n\tPriority: ' + this.priority + '\n\n\tActive Priority: ' + this.actPriority;
	
	var variables = [this.update, this.check, this.start, this.cancel, this.complete, this.finish];
	var params = [this.updateParams, this.checkParams, this.startParams, this.cancelParams, this.completeParams, this.finishParams];
	var names = ['Update', 'Check', 'Start', 'Cancel', 'Complete', 'Finish'];
	
	for (var p = 0; p < params.length; p++) {
		if (params[p].length == 0) params[p] = 'None';
	}
	
	for (var i = 0; i < variables.length; i++) {
		if (typeof variables[i] == 'function') {
			str += '\n\t' + names[i] + ': ' + variables[i];
			str += '\n\t' + names[i] + ' Params: ' + params[i];
		} else if (variables[i]) {
			str += '\n\t' + names[i] + ': ' + variables[i];
		}
	}
	str += '\n}'
	return str;
}

Dutie.CallTask.prototype.toString = function() {
	var str = '\n{ Dutie Task\n';
	
	if (this.priority || this.actPriority) str += '\nPriority: ' + this.priority + '\n\nActive Priority: ' + this.actPriority;
	
	var variables = [this.callFunc, this.update, this.check, this.start, this.cancel, this.complete, this.finishFunc, this.location];
	var params = [this.callParams, this.updateParams, this.checkParams, this.startParams, this.cancelParams, this.completeParams, this.finishParams];
	var names = ['Call', 'Update', 'Check', 'Start', 'Cancel', 'Complete', 'Finish', 'Location'];
	
	for (var p = 0; p < params.length; p++) {
		if (params[p].length == 0) params[p] = 'None';
	}
	
	for (var i = 0; i < variables.length; i++) {
		if (typeof variables[i] == 'function') {
			str += '\n\t' + names[i] + ': ' + variables[i];
			str += '\n\t' + names[i] + ' Params: ' + params[i];
		} else if (variables[i]) {
			str += '\n\t' + names[i] + ': ' + variables[i];
		}
	}
	str += '\n}'
	return str;
}

Dutie.RunTask.prototype.toString = function() {
	var str = '{ Dutie Task\n';
	
	if (this.priority || this.actPriority) str += '\nPriority: ' + this.priority + '\n\nActive Priority: ' + this.actPriority;
	
	var variables = [this.update, this.check, this.startFunc, this.cancel, this.complete, this.finishFunc, this.showManager];
	var params = [this.updateParams, this.checkParams, this.startParams, this.cancelParams, this.completeParams, this.finishParams];
	var names = ['Update', 'Check', 'Start', 'Cancel', 'Complete', 'Finish', 'Show Manager'];
	
	for (var p = 0; p < params.length; p++) {
		if (params[p].length == 0) params[p] = 'None';
	}
	
	for (var i = 0; i < variables.length; i++) {
		if (typeof variables[i] == 'function') {
			str += '\n\t' + names[i] + ': ' + variables[i];
			str += '\n\t' + names[i] + ' Params: ' + params[i];
		} else if (variables[i]) {
			str += '\n\t' + names[i] + ': ' + variables[i];
		}
	}
	str += '\n}}}}}';
	return str;
}


module.exports = Dutie;
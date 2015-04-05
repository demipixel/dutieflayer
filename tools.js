var mineflayer = require('mineflayer');
var lumberjack = require('./lumberjack');
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
var scaffoldPlugin = require('mineflayer-scaffold')(mineflayer);
var blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);

var vec3 = require('vec3');
var Dutie = require('dutie');
var spiral = require('spiralloop');
var Task = Dutie.Task;
var CallTask = Dutie.CallTask;
var RunTask = Dutie.RunTask;

var main = new Dutie();

if(process.argv.length<3 || process.argv.length>5)
{
    console.log("Usage : node tools.js <host> <port> [<name>] [<password>]");
    process.exit(1);
}
var bot = mineflayer.createBot({
    username: process.argv[4] ? process.argv[4] : "Toolster",
    verbose: true,
    port:parseInt(process.argv[3]),
    host:process.argv[2],
    password:process.argv[5]
});

navigatePlugin(bot);
blockFinderPlugin(bot);
scaffoldPlugin(bot);

bot.on('chat', chatMessage);

function chatMessage(username, message) {
	if (message == 'tools') {
		var tools = new RunTask(getTools, [], { priority: 5, actPriority: 8 });
		main.add(tools);
	}
	if (message == 'list') {
		listInventory();
	}
	//////////// COPIED FROM INVENTORY.JS
	if (/^toss (\d+) /.test(message)) {
    words = message.split(" ");
    amount = parseInt(words[1], 10);
    name = words[2];
    item = itemByName(name);
    if (item) {
      var entity = bot.players[username].entity;
      bot.lookAt(entity.position.offset(0, entity.height, 0));
      
      bot.toss(item.type, null, amount, function(err) {
        if (err) {
          bot.chat("unable to toss " + item.name);
          console.error(err.stack);
        } else {
          bot.chat("tossed " + amount + " " + item.name);
        }
      });
    } else {
      bot.chat("I have no " + name);
    }
  } else if (/^toss /.test(message)) {
    words = message.split(" ");
    name = words[1];
    item = itemByName(name);
    if (item) {
      var entity = bot.players[username].entity;
      bot.lookAt(entity.position.offset(0, entity.height, 0));
      
      bot.tossStack(item, function(err) {
        if (err) {
          bot.chat("unable to toss " + item.name);
          console.error(err.stack);
        } else {
          bot.chat("tossed " + item.name);
        }
      });
    } else {
      bot.chat("I have no " + name);
    }
  }
  ////////////////////////
  ////////////////////////
}


function getTools(m) {
	var lumb = lumberjack(4, bot);
	
	/*var wood = bot.inventory.findInventoryItem(17, null);
	bot.lookAt(bot.entity.position.offset(-2, 0, 0));
    if (wood) bot.tossStack(wood);*/
	
	
	var makePlanks = new RunTask(craftPlanks);
	
	var location = vec3(0, 0, 0);
	var getBenchLocation = new RunTask(function() { 
		var found = false;
		spiral([7, 4, 7], function(x, y, z) {
			x += Math.floor(bot.entity.position.x) - 3;
			y += Math.floor(bot.entity.position.y) - 1;
			z += Math.floor(bot.entity.position.z) - 3;
			var block = bot.blockAt(vec3(x, y, z)) || { name: null };
			if (block.name == 'workbench') {
				location.x = x;
				location.y = y;
				location.z = z;
				return true;
			}
		});
		if (found) return;
		
		spiral([7, 6, 7], function(x, y, z) {
			if (x == 3 && z == 3) return;
			x += Math.floor(bot.entity.position.x) - 3;
			y += Math.floor(bot.entity.position.y) - 3;
			z += Math.floor(bot.entity.position.z) - 3;
			y -= 1; // Prefer feet height
			var block = bot.blockAt(vec3(x, y, z));
			var block_under = bot.blockAt(vec3(x, y-1, z));
			console.log(x + ', ' + y + ', ' + z + ' => ' + block.name + ', ' + block_under.name);
			if (block.name == 'air' && block_under.name != 'air') {
				location.x = x;
				location.y = y;
				location.z = z;
				return true;
			}
		}
	)});
	
	var centerTask = new RunTask(function() {
		bot.entity.position = center(bot.entity.position);
	});
	var waitTask = new CallTask(setTimeout, [null, 200], { location: 0});
	
	var placeBench = new RunTask(placeCraftBench, [location], { start: function() {
		if (bot.blockAt(location).name == 'workbench') return true;
	}});
	
	lumb.dependBy(makePlanks).dependBy(getBenchLocation).dependBy(centerTask).dependBy(waitTask).dependBy(placeBench);
	m.addAll(lumb);
}

function craftPlanks(m) {
	console.log('craftPlanks');
	var wood = bot.inventory.findInventoryItem(17, null);
	var plankRecipeList = bot.recipesFor(5, null, null, true);
	var plankRecipe;
	for (var i = 0; i < plankRecipeList.length; i++) {
		var listmeta = plankRecipeList[i].ingredients[0].metadata
		if (wood.metadata == listmeta || !listmeta) plankRecipe = plankRecipeList[i];
	}
	if (!plankRecipe) {
		plankRecipe = plankRecipeList[0];
	}
	
	var benchRecipe = bot.recipesAll(58, null, null, true)[0];
	console.log('benchRecipe',benchRecipe);
	
	var craftTask = new CallTask(bot.craft, [plankRecipe, 4, null]);
	var benchTask = new CallTask(bot.craft, [benchRecipe, 1, null]);
	benchTask.dependOn(craftTask);
	m.addAll(craftTask);
}

function placeCraftBench(m, loc) {
	console.log('placeBench',loc);
	bench = bot.inventory.findInventoryItem(58, null);
	var switchToBench = new CallTask(bot.equip, [bench, 'hand']);
	var wait = new CallTask(setTimeout, [null, 200], { location: 0});
	
	var refBlock = bot.blockAt(loc.subtract(vec3(0, 1, 0)));
	console.log('refBlock',refBlock);
	var placeBench = new CallTask(bot.placeBlock, [refBlock, vec3(0, 1, 0)]);
	switchToBench.dependBy(wait);
	wait.dependBy(placeBench);
	
	m.addAll(placeBench);
}

function center(p) {
	return p.floored().offset(0.5,0,0.5);
}






function listInventory() {
  var text = bot.inventory.items().map(itemStr).join(", ");
  if (text == '') bot.chat('(Nothing)');
  else bot.chat(text);
}

function itemStr(item) {
  if (item) {
    return item.name + " x " + item.count;
  } else {
    return "(nothing)";
  }
}

function itemByName(name) {
  return bot.inventory.items().filter(function(item) {
    return item.name === name;
  })[0];
}
var mineflayer = require('mineflayer');
var lumberjack = require('./lumberjack');
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
var scaffoldPlugin = require('mineflayer-scaffold')(mineflayer);
var blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);

var vec3 = require('vec3');
var Dutie = require('dutie');
var spiral = require('spiralloop');
var Task = Dutie.Task,
	CallTask = Dutie.CallTask,
	RunTask = Dutie.RunTask,
	ExecTask = Dutie.ExecTask;

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

/*bot.on('spawn', function() {
	setTimeout(function() {
		var tools = new RunTask(getTools, [], { priority: 5, actPriority: 8 });
		main.add(tools);
		
		var player = 'Your username';
		var give = new RunTask(tossTools, [player], { priority: 3, actPriority: 4});
		main.add(give);
	},10*1000);
});*/

function chatMessage(username, message) {
	console.log(username);
	console.log(message);
	if (message == 'tools') {
		var tools = new RunTask(getTools, [], { priority: 5, actPriority: 8 });
		main.add(tools);
	}
	if (message == 'list') {
		listInventory();
	}
	if (message == 'give tools') {
		var give = new RunTask(tossTools, [username], { priority: 3, actPriority: 4});
		main.add(give);
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
	console.log('lumb');
	
	/*var wood = bot.inventory.findInventoryItem(17, null);
	bot.lookAt(bot.entity.position.offset(-2, 0, 0));
    if (wood) bot.tossStack(wood);*/
	
	var location = vec3(0, 0, 0);
	var foundBench = { val: false};
	var benchExists = new ExecTask(function() {
		spiral([7, 4, 7], function(x, y, z) {
			x += Math.floor(bot.entity.position.x) - 3;
			y += Math.floor(bot.entity.position.y) - 1;
			z += Math.floor(bot.entity.position.z) - 3;
			var block = bot.blockAt(vec3(x, y, z)) || { name: null };
			if (block.name == 'workbench') {
				location.x = x;
				location.y = y;
				location.z = z;
				foundBench.val = true;
				console.log('FOUND BENCH');
				return true;
			}
		});
	});
	
	var makePlanks = new RunTask(craftPlanks, [foundBench]);
	
	var getBenchLocation = new ExecTask(function() { 
		if (foundBench.val) return;
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
	)}, [], { start: function() { if (foundBench.val) return true; }});
	
	var centerTask = new ExecTask(function() {
		if (location.y == -1) return;
		bot.entity.position = center(bot.entity.position);
	});
	var waitTask = new CallTask(setTimeout, [null, 200], { location: 0, start: function() { if (foundBench.val) return true; }});
	
	var placeBench = new RunTask(placeCraftBench, [location], { start: function() {
		if (foundBench.val) return true;
	}});
	
	var craftPick = new RunTask(craftPickaxe, [location]);
	
	var stone = Array();
	var safeStandLocation = vec3(0, 0, 0);
	
	var findStone = new ExecTask(function() {
		console.log('searching for stone');
		safeStandLocation.x = bot.entity.position.x;
		safeStandLocation.y = bot.entity.position.y;
		safeStandLocation.z = bot.entity.position.z;
		
		spiral([40, 16, 40], function(x, y, z) {
			x += Math.floor(bot.entity.position.x) - 20;
			y += Math.floor(bot.entity.position.y) - 8;
			z += Math.floor(bot.entity.position.z) - 20;
			
			var block = bot.blockAt(vec3(x, y, z));
			if (block.name == 'stone') stone.push(block);
			if (stone.length > 20) return true; // Have plenty just in case some get destroyed.
		});
	});
	var switchPick = new RunTask(switchToPick);
	var mineStone = new RunTask(getStone, [stone]);
	var goBack = new RunTask(goBackToBench, [safeStandLocation]);
	var craftTools = new RunTask(craftStoneTools, [location]);
	
	lumb.dependBy(benchExists).dependBy(makePlanks).dependBy(getBenchLocation).dependBy(centerTask).dependBy(waitTask).dependBy(placeBench)
		.dependBy(craftPick).dependBy(findStone).dependBy(switchPick).dependBy(mineStone).dependBy(goBack).dependBy(craftTools);
	m.addAll(lumb);
}

function craftPlanks(m, b) {
	console.log('craft planks');
	var bench = b.val;
	var wood = bot.inventory.findInventoryItem(17, null);
	var plankRecipeList = bot.recipesFor(5, null, null, null);
	var plankRecipe;
	for (var i = 0; i < plankRecipeList.length; i++) {
		var listmeta = plankRecipeList[i].ingredients[0].metadata
		if (wood.metadata == listmeta || !listmeta) plankRecipe = plankRecipeList[i];
	}
	if (!plankRecipe) {
		plankRecipe = plankRecipeList[0];
	}
	
	var benchRecipe = bot.recipesAll(58, null, null, null)[0];
	if (!bench) console.log('craft crafting bench');
	
	var craftTask = new CallTask(bot.craft, [plankRecipe, (bench ? 3 : 4), null]); // 3:4 => Don't need to make extra if we already have a crafting bench
	var benchTask = new CallTask(bot.craft, [benchRecipe, 1, null]);
	if (!bench) { // loc contains position of crafting table if one exists
		benchTask.dependOn(craftTask);
		m.addAll(craftTask);
	} else {
		m.add(craftTask); // Don't make crafting bench if we already have one nearby
	}
}

function placeCraftBench(m, loc) {
	console.log('place crafting bench');
	var bench = bot.inventory.findInventoryItem(58, null);
	var switchToBench = new CallTask(bot.equip, [bench, 'hand']);
	var wait = new CallTask(setTimeout, [null, 200], { location: 0});
	
	var refBlock = bot.blockAt(loc.clone().minus(vec3(0, 1, 0)));
	console.log('refBlock',refBlock);
	var placeBench = new RunTask(bot.placeBlock, [refBlock, vec3(0, 1, 0)], { manager: false});
	switchToBench.dependBy(wait);
	wait.dependBy(placeBench);
	
	m.addAll(placeBench);
}

function center(p) {
	console.log('center on block');
	return p.floored().offset(0.5,0,0.5);
}

function craftPickaxe(m, location) {
	console.log('Craft sticks and pickaxe');
	var stickRecipe = bot.recipesAll(280, null, false)[0];
	var craftSticks = new CallTask(bot.craft, [stickRecipe, 3, null]);
	
	var woodPickRecipe = bot.recipesAll(270, null, true)[0];
	var craftWoodPick = new CallTask(bot.craft, [woodPickRecipe, 1, bot.blockAt(location)]);
	console.log(bot.blockAt(location));
	console.log('this',woodPickRecipe.inShape);
	
	craftWoodPick.dependOn(craftSticks);
	m.addAll(craftWoodPick);
}

function switchToPick(m) {
	console.log('switch to pickaxe');
	var pick = bot.inventory.findInventoryItem(270);
	var switchToBench = new CallTask(bot.equip, [pick, 'hand']);
	m.add(switchToBench);
}

function getStone(m, stone) {
	
	var finish = function() {
		if (this.currentTask.startFunc) { // If just bot.scaffold.to rather than digImmediate
			m.add(new RunTask(switchToPick));
		}
		var stoneInv = bot.inventory.findInventoryItem(4, null) || { count: 0};
		if (stoneInv.count < 9) { // 9 is the exact amount needed for tools. Add more if needed.
			stone.splice(0, 1);
			
			var sides = [vec3(1, 0, 0), vec3(-1, 0, 0), vec3(0, 0, 1), vec3(0, 0, -1)];
			var found = false;
			for (var y = 0; y < 2; y++) {
				for (var s = 0; s < sides.length; s++) {
					var location = bot.entity.position.clone().floor();
					location.add(sides[s]);
					location.add(vec3(0, y, 0));
					if (bot.blockAt(location).name == 'stone') {
						found = true;
						console.log('Location',location);
						digImmediate.reset([bot.blockAt(location)]);
						m.add(digImmediate);
						break;
					}
				}
				if (found) break;
			}
			
			if (!found) {
				digStone.reset([stone[0].position]);
				m.add(digStone);
			}
		} else console.log('collected all stone');
	}
	
	var start = function() {
		if (bot.blockAt(stone[0].position).name != 'stone') {
			stone.splice(0, 1);
			m.add(digStone);
		}
	}
	
	var digStone = new CallTask(bot.scaffold.to, [stone[0].position], { complete: finish, start: start });
	
	var digImmediate = new CallTask(bot.dig, [stone[0].position], { complete: finish });
	
	m.add(digStone);
}

function goBackToBench(m, loc) {
	m.add(new CallTask(bot.scaffold.to, [loc]));
}

function craftStoneTools(m, loc) {
	var bench = bot.blockAt(loc);
	
	var stoneSwordRecipe = bot.recipesAll(272, null, true)[0];
	var craftStoneSword = new CallTask(bot.craft, [stoneSwordRecipe, 1, bench]);
	
	var stonePickRecipe = bot.recipesAll(274, null, true)[0];
	var craftStonePick = new CallTask(bot.craft, [stonePickRecipe, 1, bench]);
	
	var stoneAxeRecipe = bot.recipesAll(275, null, true)[0];
	var craftStoneAxe = new CallTask(bot.craft, [stoneAxeRecipe, 1, bench]);
	
	var stoneShovelRecipe = bot.recipesAll(273, null, true)[0];
	var craftStoneShovel = new CallTask(bot.craft, [stoneShovelRecipe, 1, bench]);
	
	m.add(craftStoneSword).add(craftStonePick).add(craftStoneAxe).add(craftStoneShovel);
}




function tossTools(m, player) {
	var entity = bot.players[player].entity;
	bot.lookAt(entity.position.offset(0, entity.height, 0), true);
	var wait = new CallTask(setTimeout, [null, 500], {location: 0});
	m.add(wait);
	
	for (var i = 272; i <= 275; i++) {
		var item = bot.inventory.findInventoryItem(i);
		if (item) {
			var toss = new CallTask(bot.tossStack, [item]);
			m.add(toss);
		}
	}
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
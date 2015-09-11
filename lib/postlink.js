/*
Walk the dependencies to symlink any module having a parent module with same name & version

I should detect circular dependencies too
*/

var fs = require('fs');
var childProcess = require('child_process');
var path = require('path');
var modules = [];
var recursiveListFolder = true;
var recursivePostLink = false;

function debug(){
	var args = Array.prototype.slice.call(arguments);

	console.log.apply(console, args.map(function(arg){
		/*
		if( arg && arg.indexOf(path.sep) !== -1 ){
			return shortenPath(arg);
		}
		*/
		return arg;
	}));
}

function mergeDependencies(meta){
	var names = {};

	[
		'dependencies',
		'devDependencies',
		'optionalDependencies'
	].forEach(function(dependencyType){
		var dependencyNames = meta[dependencyType];

		if( typeof dependencyNames === 'object' ){
			for(var name in dependencyNames){
				names[name] = dependencyNames[name];
			}
		}
	});

	return names;
}

function createModuleFromPath(filepath){
	var metaPath = path.join(filepath, 'package.json');

	if( !fs.existsSync(metaPath) ){
		throw new Error(filepath + ' has no package.json');
	}

	var content = fs.readFileSync(metaPath);
	var meta;
	try{
		meta = JSON.parse(content);
	}
	catch(e){
		var error = new Error(e.message + 'in ' + metaPath);
		throw error;
	}

	return {
		name: meta.name,
		meta: meta,
		dependencies: mergeDependencies(meta),
		path: filepath
	};
}

function collectModulePaths(filename){
	var modulePaths = [];

	fs.readdirSync(filename).filter(function(name){
		return name != 'node_modules';
	}).map(function(name){
		return path.join(filename, name);
	}).forEach(function(filepath){
		if( fs.statSync(filepath).isDirectory() ){
			var metaPath = path.join(filepath, 'package.json');

			if( fs.existsSync(metaPath) ){
				modulePaths.push(filepath);
			}
			else if( recursiveListFolder ){
				modulePaths = modulePaths.concat(collectModulePaths(filepath));
			}
		}
	});

	return modulePaths;
}

function findBy(array, name, value){
	var i = 0, j = array.length;
	for(;i<j;i++){
		if( array[i][name] == value ) return array[i];
	}
	return null;
}

function getModuleByName(name){
	return findBy(modules, 'name', name);
}

function getModuleByPath(path){
	return findBy(modules, 'path', path);
}

function npmlink(moduleSource, moduleDestination){
	var relativeLocation = path.relative(moduleDestination, moduleSource);

	relativeLocation = relativeLocation.replace(/\\/g, '/');
	console.log('npm link', relativeLocation);

	childProcess.execSync('npm link ' + relativeLocation, {
		cwd: moduleDestination
	});
}

function postlink(modulePath){
	var linkedModules;
	var module = getModuleByPath(modulePath) || createModuleFromPath(modulePath);
	var dependencies = Object.keys(module.dependencies);

	if( dependencies.length ){
		/*
		console.log(module.name, 'dependencies', dependencies.map(function(dependencyName){
			return dependencyName + ':' + module.dependencies[dependencyName];
		}));
*/

		var devModules = dependencies.reduce(function(previous, dependencyName){
			var devModule = getModuleByName(dependencyName);

			if( devModule ){
				previous.push(devModule);
			}

			return previous;
		}, []);

		devModules.forEach(function(devModule){
			npmlink(devModule.path, modulePath);
		});

		if( recursivePostLink ){
			devModules.forEach(function(devModule){
				postlink(devModule.path);
			});
		}
	}
	else{
		console.log(modulePath, 'has no dependencies');
	}
}

function exec(projectPath, postlinkFolder){
	var folderPaths = postlinkFolder.split(';').map(function(folder){
		return path.normalize(folder);
	});
	console.log('postlink', folderPaths);

	// get all module paths
	var modulePaths = folderPaths.reduce(function(previous, folderPath){
		return previous.concat(collectModulePaths(folderPath));
	}, []);

	// uniq
	modulePaths = modulePaths.filter(function(modulePath, index){
		return modulePaths.indexOf(modulePath) == index;
	});

	// create module from paths
	modules = modulePaths.map(createModuleFromPath);
	//console.log('modules found', modules.map(function(module){ return module.name + '@' + module.meta.version; }));

	postlink(projectPath);
}

module.exports = exec;
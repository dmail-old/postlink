/*
Walk the dependencies to symlink any module having a parent module with same name & version

I should detect circular dependencies too
*/

var fs = require('fs');
var childProcess = require('child_process');
var path = require('path');
var configName = 'postlink_path';
var projectPath;
var folderPaths = [];
var modules = [];
var recursiveListFolder = true;
var recursivePostLink = false;
var postlinkFolder = process.env['npm_config_' + configName];

if( postlinkFolder ) folderPaths = postlinkFolder.split(';');

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
		console.log('json malformed in', metaPath);
		throw e;
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

function shortenPath(filepath){
	return path.relative(projectPath, filepath);
}

function npmlink(moduleSource, moduleDestination){
	var relativeLocation = path.relative(moduleDestination, moduleSource);

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
		console.log(module.name, 'dependencies', dependencies.map(function(dependencyName){
			return dependencyName + ':' + module.dependencies[dependencyName];
		}));

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

if( process.env.npm_config_production !== 'true' ){
	var cwd = process.cwd();
	projectPath = process.argv.length > 2 ? path.resolve(cwd, process.argv[2]) : cwd;

	console.log('postlink', projectPath);

	if( folderPaths.length === 0 ){
		console.warn(configName, 'is empty, use "npm config set postlink_folder {folder-path}" to locate module sources');
	}
	else{
		// get all module paths
		var modulePaths = folderPaths.reduce(function(previous, folderPath){
			return previous.concat(collectModulePaths(folderPath));
		}, []);

		// uniq
		modulePaths = modulePaths.filter(function(modulePath, index){
			return modulePaths.indexOf(modulePath) == index;
		});

		// make module from paths
		modules = modulePaths.map(createModuleFromPath);

		console.log('dev modules found in', folderPaths, modules.map(function(module){ return module.name + '@' + module.meta.version; }));
		postlink(projectPath);
	}
}

process.exit();
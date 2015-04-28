#!/usr/bin/env node

/*

Walk the dependencies to symlink any module having a parent module with same name & version

*/

var fs = require('fs');
var childProcess = require('child_process');
var path = require('path');
var modules = [];
var projectPath;

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

	var meta = JSON.parse(fs.readFileSync(metaPath));

	return {
		name: meta.name,
		meta: meta,
		dependencies: mergeDependencies(meta),
		path: filepath
	};
}

function collectModulePaths(filename){
	var modulePaths = [];

	fs.readdirSync(filename).map(function(name){
		return path.join(filename, name);
	}).forEach(function(filepath){

		if( fs.statSync(filepath).isDirectory() ){
			var metaPath = path.join(filepath, 'package.json');

			if( fs.existsSync(metaPath) ){
				modulePaths.push(filepath);
			}
			else{
				modulePaths = modulePaths.concat(collectModulePaths(filepath));
			}
		}
	});

	return modulePaths;
}

function collectModules(filename){
	return collectModulePaths(filename).map(createModuleFromPath);
}

function findBy(array, name, value){
	var i = 0, j = array.length;
	for(;i<j;i++){
		if( array[i][name] == value ) return array[i];
	}
	return null;
}

function getModule(modulePath){
	var module = findBy(modules, 'path', modulePath);

	if( !module ){
		module = createModuleFromPath(modulePath);
		modules.push(module);
	}

	return module;
}

function shortenPath(filepath){
	return path.relative(projectPath, filepath);
}

function debug(){
	var args = Array.prototype.slice.call(arguments);

	console.log.apply(console, args.map(function(arg){
		if( arg.indexOf(path.sep) !== -1 ){
			return shortenPath(arg);
		}
		return arg;
	}));
}

// https://github.com/isaacs/rimraf/blob/master/rimraf.js
function rmForce(filename, isDir){
	var windows = process.platform === "win32";
	function rmSync(){
		return isDir ? fs.rmdirSync(filename) : fs.unlinkSync(filename);
	}

	try{
		rmSync();
	}
	catch(e){
		if( windows && e.code === "EPERM" ){
			fs.chmodSync(filename, 666);
			rmSync();
		}
	}
}

function rmdirRecursive(filename){
	var stat = fs.lstatSync(filename);

	if( stat.isDirectory() ){
		fs.readdirSync(filename).map(function(name){
			return filename + path.sep + name;
		}).forEach(rmdirRecursive);

		rmForce(filename, true);
	}
	else if( stat.isFile() || stat.isSymbolicLink() ){
		rmForce(filename, false);
	}
	else{
		throw new Error('nothing to remove');
	}
}

function symlinkModule(source, destination){
	var lstat, exists = true;

	try{
		lstat = fs.lstatSync(destination);
	}
	catch(e){
		if( e.code == 'ENOENT' ) exists = false;
		else throw e;
	}

	if( exists ){
		if( lstat.isSymbolicLink() ){
			var linkPath = fs.readlinkSync(destination);

			if( linkPath != source ){
				debug('remove previous link to', linkPath);
				fs.unlinkSync(destination);
			}
			else{
				debug(destination, 'already linked to ', source);
				return;
			}
		}
		else{
			debug('rmdirRecursive', destination);
			rmdirRecursive(destination);
		}
	}
	// create a directory structure leading to the directory to put a symlink inside
	else{
		var directories = destination.split(path.sep), i = 0, j = directories.length -1, directory;
		for(;i<j;i++){
			directory = directories.slice(0, i + 1).join(path.sep);
			if( !fs.existsSync(directory) ){
				debug('mkdir', directory);
				fs.mkdirSync(directory);
			}
		}
	}

	debug('linking', source, '->', destination);
	fs.symlinkSync(source, destination, 'junction');
}

function symlink(modulePath){
	var linkedModules = [];
	var module = getModule(modulePath);

	childProcess.execSync('npm install', {
		cwd: modulePath
	});

	Object.keys(module.dependencies).forEach(function(dependencyName){
		var dependencyPath, dependencyModule, parentPath, parentModule;

		try{
			dependencyPath = path.dirname(require.resolve(path.join(modulePath, 'node_modules', dependencyName)));
		}
		catch(e){
			if( e.code === 'MODULE_NOT_FOUND' ){
				throw new Error('your dependency to ' + dependencyName + ' is unresolved, did you run npm install?');
			}
			throw e;
		}
		dependencyModule = getModule(dependencyPath);

		//console.log('dependency found at', dependencyPath);

		try{
			parentPath = path.dirname(require.resolve(dependencyName));
		}
		catch(e){
			if( e.code === 'MODULE_NOT_FOUND' ){
				console.log(dependencyName, 'has no parent module to link');
				return;
			}
			throw e;
		}
		parentModule = getModule(parentPath);

		//console.log('parent found at', parentPath);

		if( parentModule != dependencyModule ){ // possible when linked dependency targets the parent
			//console.log('parent found at', parentPath);

			if( dependencyModule.meta.version === parentModule.meta.version ){
				symlinkModule(parentModule.path, dependencyModule.path);
				linkedModules.push(parentModule.path);
			}
			else{
				console.warn(
					'Cannot symlink: version mismatch',
					'parent', parentModule.name, '@', parentModule.meta.version, '!=',
					'module', dependencyModule.name, '@', dependencyModule.meta.version
				);
			}
		}
	});

	linkedModules.forEach(function(folderPath){
		symlink(folderPath);
	});
}

if( process.env.npm_config_production !== 'true' ){
	projectPath = process.argv.length > 2 ? process.argv[2] : process.cwd();
	console.log('symlink', projectPath);
	symlink(projectPath);
}

process.exit();
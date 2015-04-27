/*

For each module found in the source folder
replace the duplicate by a symlink to the sources

*/

var fs = require('fs');
var childProcess = require('child_process');
var path = require('path');

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
	return collectModulePaths(filename).map(function(modulePath){
		var metaPath = path.join(modulePath, 'package.json');
		var meta = JSON.parse(fs.readFileSync(metaPath));

		return {
			name: meta.name,
			meta: meta,
			dependencies: mergeDependencies(meta),
			path: modulePath
		};
	});
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

// we can have EPERM issues here: https://github.com/isaacs/rimraf/blob/master/rimraf.js
// chmod 666 fix the problem I don't want to depend on rimraf
function rmdirRecursive(filename){
	var stat = fs.lstatSync(filename);

	if( stat.isDirectory() ){
		fs.readdirSync(filename).map(function(name){
			return filename + path.sep + name;
		}).forEach(rmdirRecursive);

		fs.rmdirSync(filename);
	}
	else if( stat.isFile() || stat.isSymbolicLink() ){
		fs.unlinkSync(filename);
	}
	else{
		throw new Error('nothing to remove');
	}
}

var projectPath = process.cwd();
var sourceFolder = path.resolve(projectPath, process.argv[2]);

console.log('symlink will sync', sourceFolder, 'with', projectPath);

var sourceModules = collectModules(sourceFolder);

function findByName(array, name){
	var i = 0, j = array.length;
	for(;i<j;i++){
		if( array[i].name === name ) return array[i];
	}
	return null;
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
				console.log('remove previous link to', linkPath);
				fs.unlinkSync(destination);
			}
			else{
				console.log(destination, 'already linked to ', source);
				return;
			}
		}
		else{
			console.log('rmdirRecursive', destination);
			rmdirRecursive(destination);
		}
	}
	// create a directory structure leading to the directory to put a symlink inside
	else{
		var directories = destination.split(path.sep), i = 0, j = directories.length -1, directory;
		for(;i<j;i++){
			directory = directories.slice(0, i + 1).join(path.sep);
			if( !fs.existsSync(directory) ){
				console.log('mkdir', directory);
				fs.mkdirSync(directory);
			}
		}
	}

	console.log('linking', source, '->', destination);
	fs.symlinkSync(source, destination, 'dir');
}

function symlink(projectPath){
	var metaPath = projectPath + path.sep + 'package.json';
	var nodeModulePath = projectPath + path.sep + 'node_modules';

	if( !fs.existsSync(metaPath) ){
		throw new Error(projectPath + ' has no package.json');
	}

	var toSymlink = [];

	// always symlink sources into project
	sourceModules.forEach(function(sourceModule){
		var sourcePath = sourceModule.path;
		var modulePath = path.join(nodeModulePath, sourceModule.name);
		toSymlink.push({
			source: sourcePath,
			destination: modulePath
		});
	});

	// symlink existing duplicate
	if( fs.existsSync(nodeModulePath) ){
		collectModules(projectPath).forEach(function(projectModule){
			var sourceModule = findByName(sourceModules, projectModule.name);
			if( sourceModule ){
				if( sourceModule.meta.version === projectModule.meta.version ){
					toSymlink.push({
						source: sourceModule.path,
						destination: projectModule.path
					});
				}
				else{
					console.warn(
						'Cannot symlink: version mismatch',
						'local', sourceModule.name, '@', sourceModule.meta.version, '!=',
						'project', projectModule.name, '@', projectModule.meta.version
					);
				}
			}
		});
	}

	// do symlink, TODO: avoid symlink twice
	toSymlink.forEach(function(symlinkArgs){
		symlinkModule(symlinkArgs.source, symlinkArgs.destination);
	});

	var toInstall = [];

	// check if any local modules has external dependency, if so they will be installed in the top folder
	// not in the local modules itself (to prevent pollution of your source folder)
	// if your local module has an external dependency version conflict it can be a problem
	sourceModules.forEach(function(sourceModule){
		Object.keys(sourceModule.dependencies).filter(function(dependency, index, dependencies){
			if( !findByName(sourceModules, dependency) ){
				toInstall.push({
					name: dependency,
					value: sourceModule.dependencies[dependency]
				});
			}
		});
	});

	// do npm install, TODO: avoid npm install twice
	toInstall.forEach(function(installArgs){
		var name = installArgs.name;
		var value = installArgs.value;
		var cmd;

		if( value === '*' ){
			cmd = name;
		}
		else if( typeof Number(value) === 'number' ){
			cmd = name + '@' + value;
		}
		else if( ['<', '^', '~', '>'].indexOf(value[0]) !== -1 ){
			cmd = name + '@' + '"' + value + '"';
		}
		else{
			cmd = value;
		}

		console.log('npm install', cmd);
		childProcess.execSync('npm install ' + cmd);
	});
}

if( process.env.npm_config_production !== 'true' ){
	symlink(projectPath);
}

process.exit();
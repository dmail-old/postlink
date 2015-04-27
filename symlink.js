/*

For each module found in the source folder
replace the duplicate by a symlink to the sources

*/

var fs = require('fs');
var childProcess = require('child_process');
var path = require('path');

function collectModules(filename){
	var modules = [];

	return fs.readdirSync(filename).map(function(name){
		return filename + path.sep + name;
	}).filter(function(filepath){
		return fs.statSync(filepath).isDirectory() && fs.existsSync(filepath + path.sep + 'package.json');
	}).map(function(modulePath){
		var meta = JSON.parse(fs.readFileSync(modulePath + path.sep + 'package.json'));
		
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
var sourceModules = collectModules(sourceFolder);

function findByName(array, name){
	var i = 0, j = array.length;
	for(;i<j;i++){
		if( array[i].name === name ) return array[i]; 
	}
	return null;
}

function symlink(projectPath){
	var metaPath = projectPath + path.sep + 'package.json';
	var nodeModulePath = projectPath + path.sep + 'node_modules';
	
	if( !fs.existsSync(metaPath) ){
		throw new Error(projectPath + ' has no package.json');
	}

	var meta = JSON.parse(fs.readFileSync(metaPath));
	var moduleNames = Object.keys(mergeDependencies(meta));
	var usedSourceModules = sourceModules.filter(function(sourceModule){
		var index = moduleNames.indexOf(sourceModule.name);
		return index !== -1;
	});
	var toInstall = [];

	// add indirect dependency (dependency of dependency) recursively
	function addIndirectDependency(sourceModule){
		Object.keys(sourceModule.dependencies).filter(function(dependency, index, dependencies){
			// dependency already present
			if( moduleNames.indexOf(dependency) !== -1 ) return;
			moduleNames.push(dependency);

			var indirectSourceModule = findByName(sourceModules, dependency);
			if( indirectSourceModule ){
				usedSourceModules.push(indirectSourceModule);
				addIndirectDependency(indirectSourceModule);
			}
			else{
				// if local sources of subdependency is not found, install them in the top folder
				toInstall.push({
					name: dependency,
					value: sourceModule.dependencies[dependency]
				});
			}
		});
	}

	usedSourceModules.forEach(addIndirectDependency);
	
	usedSourceModules.forEach(function(sourceModule){
		var sourcePath = sourceModule.path;
		var modulePath = path.join(nodeModulePath, sourceModule.name);
		var lstat, exists = true;

		try{
			lstat = fs.lstatSync(modulePath);
		}
		catch(e){
			if( e.code == 'ENOENT' ) exists = false;
			else throw e;
		}

		if( exists ){
			if( lstat.isSymbolicLink() ){
				var linkPath = fs.readlinkSync(modulePath);

				if( linkPath != sourcePath ){
					console.log('remove previous link to', linkPath);
					fs.unlinkSync(modulePath);
				}
				else{
					console.log(modulePath, 'already linked to ', sourcePath);
					return;
				}				
			}
			else{
				console.log('rmdirRecursive', modulePath);
				rmdirRecursive(modulePath);
			}
		}
		// create a directory structure leading to the directory to put a symlink inside
		else{
			var directories = modulePath.split(path.sep), i = 0, j = directories.length -1, directory;
			for(;i<j;i++){
				directory = directories.slice(0, i + 1).join(path.sep);
				if( !fs.existsSync(directory) ){
					console.log('mkdir', directory);
					fs.mkdirSync(directory);
				}
			}
		}

		console.log('linking', sourcePath, '->', modulePath);
		fs.symlinkSync(sourcePath, modulePath, 'dir');	
	});

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
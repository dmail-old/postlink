# symlink

Keep your module sources out of your working directory.

## Example

With this directory structure

```
/node_modules
	/module-under-dev-a
	/module-under-dev-b
/your-project
```

Do

- `npm install -g symlink`
- `cd your-project`
- `symlink ../node_modules`

It will symlink your local modules in the top level node_modules folder

```
/your-project
	/node_modules
		/[symlink to ../../node_modules/module-under-dev-a]
		/[symlink to ../../node_modules/module-under-dev-b]
```

You can run `symlink ../node_modules` to keep your folder in sync with your project before or after `npm install`

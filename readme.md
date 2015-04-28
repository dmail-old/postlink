# symlink

Symlink your module to keep clean and separate sources from project usage

## Example

Before

```
/node_modules
	/a@1.0.0
	/b@0.0.3
/your-project
    /node_modules
    	/a@1.0.0
    		/node_modules
    			b@0.0.3
    	/b@0.5.0
```

`cd your-project && symlink`

```
/node_modules
	/a@1.0.0
		/node_modules
			/-> ../../b@0.0.3
	/b@0.0.3
/your-project
    /node_modules
    	/-> ../../node_modules/a@1.0.0
    	/b@0.5.0
```

Very similar to [zelda](https://github.com/feross/zelda)
# prelink

link your local modules to avoid duplication

## Using package.json

- Install globally : `npm install -g prelink`
- Set folder containing git repo : `npm config set git_repo_path "${HOME}/Documents/GitHub"`

Now you can add the preinstall script in your `package.json`

```json
{
    "scripts": {
        "preinstall": "prelink"
    }
}
```

## Known issues with named package

Right now npm fails to detect that named package are already linked.
You got two options for now:

- Rerun prelink postinstall
- Only run preinstall scripts (thus avoiding npm install) : `npm run preinstall`

## Notes

Similar to [zelda](https://github.com/feross/zelda)
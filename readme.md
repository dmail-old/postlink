# postlink

link your local modules to avoid duplication

## Using package.json

- Install globally : `npm install -g postlink`
- Set folder containing git repo : `npm config set postlink_folder "${HOME}/Documents/GitHub"`

Now you can add the postinstall script in your `package.json`

```json
{
    "scripts": {
        "postinstall": "postlink"
    }
}
```

## Notes

Similar to [zelda](https://github.com/feross/zelda)
